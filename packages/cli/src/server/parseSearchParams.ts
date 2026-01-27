/**
 * @cloudwerk/cli - Search Params Parser
 *
 * Utility for parsing URL search parameters from Hono Context.
 */

import type { Context } from 'hono'

/**
 * Parse search params from request URL.
 *
 * Handles multiple values for the same key by converting to array.
 * Single values remain as strings, multiple values become string arrays.
 *
 * @param c - Hono context
 * @returns Parsed search params object
 *
 * @example
 * // /page?tags=a&tags=b&page=1
 * // Returns: { tags: ['a', 'b'], page: '1' }
 *
 * @example
 * // /page?search=hello
 * // Returns: { search: 'hello' }
 *
 * @example
 * // /page
 * // Returns: {}
 */
export function parseSearchParams(
  c: Context
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {}
  const url = new URL(c.req.url)

  for (const [key, value] of url.searchParams.entries()) {
    const existing = result[key]
    if (existing !== undefined) {
      // Convert to array if not already, then append
      result[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value]
    } else {
      result[key] = value
    }
  }

  return result
}
