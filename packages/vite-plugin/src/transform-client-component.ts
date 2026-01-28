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

    if (exportInfo.type === null) {
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

    // Meta object for the wrapper
    const metaObj = JSON.stringify({ componentId, bundlePath })

    // Transform based on export type
    switch (exportInfo.type) {
      case 'function': {
        if (exportInfo.name) {
          // export default function Name() {} or export default async function Name() {}
          // Transform: remove "export default", keep function, add wrapper
          const asyncPrefix = exportInfo.isAsync ? 'async ' : ''
          transformed = transformed.replace(
            new RegExp(`export\\s+default\\s+${asyncPrefix}function\\s+${exportInfo.name}`),
            `${asyncPrefix}function ${exportInfo.name}`
          )
          transformed = wrapperImport + transformed
          transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
        } else {
          // export default function() {} (anonymous)
          // Assign to a variable first
          const asyncPrefix = exportInfo.isAsync ? 'async ' : ''
          transformed = transformed.replace(
            new RegExp(`export\\s+default\\s+${asyncPrefix}function\\s*\\(`),
            `const __OriginalComponent = ${asyncPrefix}function(`
          )
          transformed = wrapperImport + transformed
          transformed += `\nconst __WrappedComponent = __createWrapper(__OriginalComponent, ${metaObj})\nexport default __WrappedComponent\n`
        }
        break
      }

      case 'arrow': {
        // export default () => {} or export default async () => {}
        // Replace the export default with a variable assignment
        // Since AST already confirmed this is an arrow function, we can use a simple replacement
        transformed = transformed.replace(
          /export\s+default/,
          'const __OriginalComponent ='
        )
        transformed = wrapperImport + transformed
        transformed += `\nconst __WrappedComponent = __createWrapper(__OriginalComponent, ${metaObj})\nexport default __WrappedComponent\n`
        break
      }

      case 'class': {
        if (exportInfo.name) {
          // export default class Name {}
          transformed = transformed.replace(
            new RegExp(`export\\s+default\\s+class\\s+${exportInfo.name}`),
            `class ${exportInfo.name}`
          )
          transformed = wrapperImport + transformed
          transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
        } else {
          // export default class {} (anonymous)
          transformed = transformed.replace(
            /export\s+default\s+class\s*\{/,
            'const __OriginalComponent = class {'
          )
          transformed = wrapperImport + transformed
          transformed += `\nconst __WrappedComponent = __createWrapper(__OriginalComponent, ${metaObj})\nexport default __WrappedComponent\n`
        }
        break
      }

      case 'identifier': {
        // export default Name (where Name is defined elsewhere)
        transformed = transformed.replace(
          /export\s+default\s+\w+\s*;?\s*$/m,
          ''
        )
        transformed = wrapperImport + transformed
        transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
        break
      }

      case 'named-export': {
        // export { Name as default }
        transformed = transformed.replace(
          /export\s*\{\s*\w+\s+as\s+default\s*\}\s*;?/,
          ''
        )
        transformed = wrapperImport + transformed
        transformed += `\nconst __WrappedComponent = __createWrapper(${exportInfo.name}, ${metaObj})\nexport default __WrappedComponent\n`
        break
      }
    }

    return {
      code: transformed,
      success: true,
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
