/**
 * @cloudwerk/vite-plugin - Client Component Transform
 *
 * AST-based transformation of client components using SWC.
 * Replaces the fragile regex-based approach with proper parsing.
 */

import { parseSync, type Module, type ExportDefaultExpression, type ExportDefaultDeclaration } from '@swc/core'

// ============================================================================
// Types
// ============================================================================

export interface TransformOptions {
  /** Unique component ID for hydration */
  componentId: string
  /** Path to the client bundle */
  bundlePath: string
}

export interface TransformResult {
  /** Transformed code */
  code: string
  /** Whether transformation was successful */
  success: boolean
  /** Error message if transformation failed */
  error?: string
  /** Named exports that were wrapped (empty/undefined means only default) */
  wrappedExports?: string[]
}

// ============================================================================
// AST Helpers
// ============================================================================

/**
 * Find the default export in an AST module.
 * Returns information about the export type and any associated name.
 */
function findDefaultExport(ast: Module): {
  type: 'function' | 'class' | 'arrow' | 'identifier' | 'named-export' | null
  name: string | null
  index: number
  isAsync?: boolean
} {
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i]

    // export default function Name() {}
    // export default function() {}
    // export default async function Name() {}
    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node as ExportDefaultDeclaration
      if (decl.decl.type === 'FunctionExpression') {
        return {
          type: 'function',
          name: decl.decl.identifier?.value ?? null,
          index: i,
          isAsync: decl.decl.async,
        }
      }
      // export default class Name {}
      if (decl.decl.type === 'ClassExpression') {
        return {
          type: 'class',
          name: decl.decl.identifier?.value ?? null,
          index: i,
        }
      }
    }

    // export default <expression>
    // This covers: export default Counter, export default () => {}, etc.
    if (node.type === 'ExportDefaultExpression') {
      const expr = node as ExportDefaultExpression
      // export default SomeName (identifier reference)
      if (expr.expression.type === 'Identifier') {
        return {
          type: 'identifier',
          name: expr.expression.value,
          index: i,
        }
      }
      // export default () => {} or export default async () => {}
      if (expr.expression.type === 'ArrowFunctionExpression') {
        return {
          type: 'arrow',
          name: null,
          index: i,
          isAsync: expr.expression.async,
        }
      }
      // export default function() {} (as expression)
      if (expr.expression.type === 'FunctionExpression') {
        return {
          type: 'function',
          name: expr.expression.identifier?.value ?? null,
          index: i,
          isAsync: expr.expression.async,
        }
      }
      // export default class {} (as expression)
      if (expr.expression.type === 'ClassExpression') {
        return {
          type: 'class',
          name: expr.expression.identifier?.value ?? null,
          index: i,
        }
      }
    }

    // export { Name as default }
    if (node.type === 'ExportNamedDeclaration') {
      const specifiers = node.specifiers
      for (const spec of specifiers) {
        if (spec.type === 'ExportSpecifier') {
          const exported = spec.exported
          if (exported && exported.type === 'Identifier' && exported.value === 'default') {
            // The local name being exported as default
            if (spec.orig.type === 'Identifier') {
              return {
                type: 'named-export',
                name: spec.orig.value,
                index: i,
              }
            }
          }
        }
      }
    }
  }

  return { type: null, name: null, index: -1 }
}

/**
 * Information about a named export found in the AST.
 */
interface NamedExportInfo {
  /** Export name (e.g., 'Counter') */
  name: string
  /** Type of export declaration */
  type: 'function' | 'class' | 'const'
  /** Index in the AST body */
  index: number
  /** Span start offset in the source */
  spanStart: number
  /** Span end offset in the source */
  spanEnd: number
  /** Whether this is an async function */
  isAsync?: boolean
}

/**
 * Find all named exports that look like React components (capitalized names).
 * Matches: export function Foo() {}, export const Foo = ..., export class Foo {}
 */
function findNamedExports(ast: Module): NamedExportInfo[] {
  const results: NamedExportInfo[] = []

  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i]

    if (node.type === 'ExportDeclaration') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decl = (node as any).declaration

      // export function Foo() {}
      if (decl.type === 'FunctionDeclaration') {
        const name = (decl.identifier as { value: string })?.value
        if (name && /^[A-Z]/.test(name)) {
          results.push({
            name,
            type: 'function',
            index: i,
            spanStart: node.span.start,
            spanEnd: node.span.end,
            isAsync: decl.async as boolean,
          })
        }
      }

      // export class Foo {}
      if (decl.type === 'ClassDeclaration') {
        const name = (decl.identifier as { value: string })?.value
        if (name && /^[A-Z]/.test(name)) {
          results.push({
            name,
            type: 'class',
            index: i,
            spanStart: node.span.start,
            spanEnd: node.span.end,
          })
        }
      }

      // export const Foo = ...
      if (decl.type === 'VariableDeclaration') {
        const declarations = decl.declarations as Array<{ id: { value: string }; span: { start: number; end: number } }>
        for (const declarator of declarations) {
          const name = declarator.id?.value
          if (name && /^[A-Z]/.test(name)) {
            results.push({
              name,
              type: 'const',
              index: i,
              spanStart: node.span.start,
              spanEnd: node.span.end,
            })
          }
        }
      }
    }
  }

  return results
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform a client component to wrap its default export with hydration wrapper.
 *
 * This uses SWC to parse the code and determine the export pattern, then
 * applies the appropriate transformation.
 *
 * Supported patterns:
 * - export default function Name() {}
 * - export default function() {}
 * - export default async function Name() {}
 * - export default () => {}
 * - export default async () => {}
 * - export default class Name {}
 * - export default Name (identifier reference)
 * - export { Name as default }
 */
export function transformClientComponent(
  code: string,
  options: TransformOptions
): TransformResult {
  const { componentId, bundlePath } = options

  try {
    // Parse the code with SWC
    const ast = parseSync(code, {
      syntax: 'typescript',
      tsx: true,
      comments: true,
    })

    // Find the default export
    const exportInfo = findDefaultExport(ast)

    // Find named exports (capitalized names = React components)
    const namedExports = findNamedExports(ast)

    if (exportInfo.type === null && namedExports.length === 0) {
      return {
        code,
        success: false,
        error: `Could not find default export in client component: ${componentId}`,
      }
    }

    // Remove the 'use client' directive
    let transformed = code.replace(/['"]use client['"]\s*;?\s*\n?/g, '')

    // Add the wrapper import at the top
    const wrapperImport = `import { createClientComponentWrapper as __createWrapper } from '@cloudwerk/ui/client'\n`

    // Meta object for the wrapper (default export)
    const metaObj = JSON.stringify({ componentId, bundlePath })

    // Track which named exports were wrapped
    const wrappedExports: string[] = []

    // --- Wrap named exports (process in reverse order to avoid offset corruption) ---
    if (namedExports.length > 0) {
      // Sort in reverse source order so replacements don't shift later offsets
      const sorted = [...namedExports].sort((a, b) => b.spanStart - a.spanStart)

      for (const namedExport of sorted) {
        const namedMetaObj = JSON.stringify({
          componentId: `${componentId}__${namedExport.name}`,
          bundlePath,
        })

        const originalName = `__${namedExport.name}_original`

        switch (namedExport.type) {
          case 'function': {
            const asyncPrefix = namedExport.isAsync ? 'async ' : ''
            // Replace: export function Foo() { ... }
            // With:    function __Foo_original() { ... }
            transformed = transformed.replace(
              new RegExp(`export\\s+${asyncPrefix}function\\s+${namedExport.name}\\s*\\(`),
              `${asyncPrefix}function ${originalName}(`
            )
            break
          }
          case 'class': {
            transformed = transformed.replace(
              new RegExp(`export\\s+class\\s+${namedExport.name}\\s`),
              `class ${originalName} `
            )
            break
          }
          case 'const': {
            transformed = transformed.replace(
              new RegExp(`export\\s+(const|let|var)\\s+${namedExport.name}\\s*=`),
              `const ${originalName} =`
            )
            break
          }
        }

        // Append re-export with wrapper
        transformed += `\nexport const ${namedExport.name} = __createWrapper(${originalName}, ${namedMetaObj})\n`
        wrappedExports.push(namedExport.name)
      }
    }

    // --- Wrap default export ---
    if (exportInfo.type !== null) {
      switch (exportInfo.type) {
        case 'function': {
          if (exportInfo.name) {
            const asyncPrefix = exportInfo.isAsync ? 'async ' : ''
            transformed = transformed.replace(
              new RegExp(`export\\s+default\\s+${asyncPrefix}function\\s+${exportInfo.name}`),
              `${asyncPrefix}function ${exportInfo.name}`
            )
            transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
          } else {
            const asyncPrefix = exportInfo.isAsync ? 'async ' : ''
            transformed = transformed.replace(
              new RegExp(`export\\s+default\\s+${asyncPrefix}function\\s*\\(`),
              `const __OriginalComponent = ${asyncPrefix}function(`
            )
            transformed += `\nconst __WrappedComponent = __createWrapper(__OriginalComponent, ${metaObj})\nexport default __WrappedComponent\n`
          }
          break
        }

        case 'arrow': {
          transformed = transformed.replace(
            /export\s+default/,
            'const __OriginalComponent ='
          )
          transformed += `\nconst __WrappedComponent = __createWrapper(__OriginalComponent, ${metaObj})\nexport default __WrappedComponent\n`
          break
        }

        case 'class': {
          if (exportInfo.name) {
            transformed = transformed.replace(
              new RegExp(`export\\s+default\\s+class\\s+${exportInfo.name}`),
              `class ${exportInfo.name}`
            )
            transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
          } else {
            transformed = transformed.replace(
              /export\s+default\s+class\s*\{/,
              'const __OriginalComponent = class {'
            )
            transformed += `\nconst __WrappedComponent = __createWrapper(__OriginalComponent, ${metaObj})\nexport default __WrappedComponent\n`
          }
          break
        }

        case 'identifier': {
          transformed = transformed.replace(
            /export\s+default\s+\w+\s*;?\s*$/m,
            ''
          )
          transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
          break
        }

        case 'named-export': {
          transformed = transformed.replace(
            /export\s*\{\s*\w+\s+as\s+default\s*\}\s*;?/,
            ''
          )
          transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
          break
        }
      }
    }

    // Prepend wrapper import
    transformed = wrapperImport + transformed

    return {
      code: transformed,
      success: true,
      wrappedExports: wrappedExports.length > 0 ? wrappedExports : undefined,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      code,
      success: false,
      error: `Failed to parse client component ${componentId}: ${message}`,
    }
  }
}
