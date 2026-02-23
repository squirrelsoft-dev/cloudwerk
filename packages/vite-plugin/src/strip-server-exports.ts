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
  const removals: Array<{ start: number; end: number }> = []

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
          const exportedName = spec.exported
            ? (spec.exported.type === 'Identifier' ? spec.exported.value : spec.exported.value)
            : (spec.orig.type === 'Identifier' ? spec.orig.value : null)

          const origName = spec.orig.type === 'Identifier' ? spec.orig.value : null

          if (exportedName && SERVER_ONLY_EXPORTS.has(exportedName)) {
            serverSpecifiers.push(exportedName)
          } else if (origName && SERVER_ONLY_EXPORTS.has(origName) && !exportedName) {
            serverSpecifiers.push(origName)
          } else {
            // Reconstruct the kept specifier text
            if (spec.exported && spec.orig.type === 'Identifier') {
              const exportedVal = spec.exported.type === 'Identifier' ? spec.exported.value : spec.exported.value
              if (exportedVal !== spec.orig.value) {
                keptSpecifiers.push(`${spec.orig.value} as ${exportedVal}`)
              } else {
                keptSpecifiers.push(spec.orig.value)
              }
            } else if (spec.orig.type === 'Identifier') {
              keptSpecifiers.push(spec.orig.value)
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
          // @ts-expect-error - extending the type for replacement text
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
    const replacement = (removal as { replacement?: string }).replacement ?? ''
    result = result.slice(0, start) + replacement + result.slice(end)
  }

  return { code: result, stripped }
}
