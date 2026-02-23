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

  return { code: result, stripped }
}
