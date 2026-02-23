/**
 * @cloudwerk/vite-plugin - Strip Server Exports
 *
 * SWC-based transform that removes server-only named exports from page/layout
 * modules when bundling for the client. This prevents loaders, config, and
 * other server-only code from leaking into client bundles.
 *
 * Once these exports are removed, their server-only imports become unused
 * and are tree-shaken by Vite/Rollup automatically.
 */

import { parseSync } from '@swc/core'

const SERVER_ONLY_EXPORTS = new Set(['loader', 'config', 'generateStaticParams'])

export interface StripResult {
  code: string
  stripped: string[]
}

/**
 * Strip server-only named exports from a page or layout module.
 *
 * Handles these export patterns:
 * - `export async function loader() {}`
 * - `export function loader() {}`
 * - `export const config = {}`
 * - `export { loader } from './loader'`
 * - `export { loader, config }`
 *
 * The `default` export is always preserved.
 */
export function stripServerExports(code: string): StripResult {
  const ast = parseSync(code, {
    syntax: 'typescript',
    tsx: true,
    comments: true,
  })

  const stripped: string[] = []
  // Collect ranges to remove (in reverse order to preserve indices)
  const removals: Array<{ start: number; end: number; replacement?: string }> = []

  for (const node of ast.body) {
    // export function loader() {} / export async function loader() {}
    // export const config = {} / export let config = ...
    if (node.type === 'ExportDeclaration') {
      const decl = node.declaration

      if (decl.type === 'FunctionDeclaration' && SERVER_ONLY_EXPORTS.has(decl.identifier.value)) {
        stripped.push(decl.identifier.value)
        removals.push({ start: node.span.start, end: node.span.end })
        continue
      }

      if (decl.type === 'VariableDeclaration') {
        // Check if all declarators are server-only exports
        const names = decl.declarations
          .map((d) => d.id.type === 'Identifier' ? d.id.value : null)
          .filter(Boolean) as string[]

        const allServerOnly = names.length > 0 && names.every((n) => SERVER_ONLY_EXPORTS.has(n))
        if (allServerOnly) {
          stripped.push(...names)
          removals.push({ start: node.span.start, end: node.span.end })
        }
      }
    }

    // export { loader } / export { loader, config }
    // export { loader } from './loader'
    if (node.type === 'ExportNamedDeclaration') {
      const specifiers = node.specifiers
      if (specifiers.length === 0) continue

      // Check which specifiers are server-only
      const serverSpecifiers: string[] = []
      const keptSpecifiers: string[] = []

      for (const spec of specifiers) {
        if (spec.type === 'ExportSpecifier') {
          const exportedName = spec.exported?.type === 'Identifier' ? spec.exported.value : null
          const origName = spec.orig.type === 'Identifier' ? spec.orig.value : null
          // The effective export name: explicit alias, or the original name
          const effectiveName = exportedName ?? origName

          if (effectiveName && SERVER_ONLY_EXPORTS.has(effectiveName)) {
            serverSpecifiers.push(effectiveName)
          } else {
            // Reconstruct the kept specifier text
            if (origName) {
              if (exportedName && exportedName !== origName) {
                keptSpecifiers.push(`${origName} as ${exportedName}`)
              } else {
                keptSpecifiers.push(origName)
              }
            }
          }
        }
      }

      if (serverSpecifiers.length === 0) continue

      stripped.push(...serverSpecifiers)

      if (keptSpecifiers.length === 0) {
        // Remove the entire export statement
        removals.push({ start: node.span.start, end: node.span.end })
      } else {
        // Reconstruct with only the kept specifiers
        const source = node.source
          ? ` from ${code.slice(node.source.span.start - ast.span.start, node.source.span.end - ast.span.start)}`
          : ''
        const replacement = `export { ${keptSpecifiers.join(', ')} }${source}`
        removals.push({
          start: node.span.start,
          end: node.span.end,
          replacement,
        })
      }
    }
  }

  if (removals.length === 0) {
    return { code, stripped: [] }
  }

  // Apply removals in reverse order to preserve indices
  const offset = ast.span.start
  let result = code

  // Sort by start position descending
  removals.sort((a, b) => b.start - a.start)

  for (const removal of removals) {
    const start = removal.start - offset
    const end = removal.end - offset
    const replacement = removal.replacement ?? ''
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  // Remove imports that became unused after stripping server exports
  result = removeUnusedImports(result)

  return { code: result, stripped }
}

/**
 * Remove import declarations whose specifiers are no longer referenced
 * in the remaining code. Side-effect imports (no specifiers) are preserved.
 */
function removeUnusedImports(code: string): string {
  const ast = parseSync(code, {
    syntax: 'typescript',
    tsx: true,
    comments: true,
  })

  const offset = ast.span.start

  // Gather import declarations and their spans
  interface ImportInfo {
    node: typeof ast.body[number]
    start: number
    end: number
    specifiers: Array<{ localName: string }>
  }

  const imports: ImportInfo[] = []

  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') continue
    // Skip side-effect imports (e.g. import './styles.css')
    if (node.specifiers.length === 0) continue

    const specifiers: Array<{ localName: string }> = []
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier') {
        specifiers.push({ localName: spec.local.value })
      } else if (spec.type === 'ImportDefaultSpecifier') {
        specifiers.push({ localName: spec.local.value })
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        specifiers.push({ localName: spec.local.value })
      }
    }

    if (specifiers.length > 0) {
      imports.push({
        node,
        start: node.span.start,
        end: node.span.end,
        specifiers,
      })
    }
  }

  if (imports.length === 0) return code

  // Build remaining code (everything except import declarations) for usage scanning
  const importRanges = imports.map((i) => ({ start: i.start - offset, end: i.end - offset }))
  let remaining = ''
  let pos = 0
  for (const range of importRanges.sort((a, b) => a.start - b.start)) {
    remaining += code.slice(pos, range.start)
    pos = range.end
  }
  remaining += code.slice(pos)

  const removals: Array<{ start: number; end: number; replacement?: string }> = []

  for (const imp of imports) {
    const unusedSpecs: string[] = []
    const usedSpecs: Array<{ localName: string }> = []

    for (const spec of imp.specifiers) {
      const regex = new RegExp(`\\b${escapeRegExp(spec.localName)}\\b`)
      if (regex.test(remaining)) {
        usedSpecs.push(spec)
      } else {
        unusedSpecs.push(spec.localName)
      }
    }

    if (unusedSpecs.length === 0) continue

    if (usedSpecs.length === 0) {
      // Remove entire import
      removals.push({ start: imp.start, end: imp.end })
    } else {
      // Reconstruct with only the kept specifiers
      const importNode = imp.node as Extract<typeof ast.body[number], { type: 'ImportDeclaration' }>
      const source = code.slice(
        importNode.source.span.start - offset,
        importNode.source.span.end - offset,
      )
      const typeOnly = importNode.typeOnly ? 'type ' : ''

      // Separate default/namespace from named specifiers
      const keptNamed: string[] = []
      let keptDefault: string | null = null
      let keptNamespace: string | null = null

      for (const spec of importNode.specifiers) {
        const localName = spec.local.value
        if (!usedSpecs.some((u) => u.localName === localName)) continue

        if (spec.type === 'ImportDefaultSpecifier') {
          keptDefault = localName
        } else if (spec.type === 'ImportNamespaceSpecifier') {
          keptNamespace = localName
        } else if (spec.type === 'ImportSpecifier') {
          const imported = spec.imported
          if (imported && imported.type === 'Identifier' && imported.value !== localName) {
            keptNamed.push(`${imported.value} as ${localName}`)
          } else {
            keptNamed.push(localName)
          }
        }
      }

      const parts: string[] = []
      if (keptDefault) parts.push(keptDefault)
      if (keptNamespace) parts.push(`* as ${keptNamespace}`)
      if (keptNamed.length > 0) parts.push(`{ ${keptNamed.join(', ')} }`)

      const replacement = `import ${typeOnly}${parts.join(', ')} from ${source}`
      removals.push({ start: imp.start, end: imp.end, replacement })
    }
  }

  if (removals.length === 0) return code

  // Apply removals in reverse order
  let result = code
  removals.sort((a, b) => b.start - a.start)

  for (const removal of removals) {
    const start = removal.start - offset
    const end = removal.end - offset
    const replacement = removal.replacement ?? ''
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return result
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
