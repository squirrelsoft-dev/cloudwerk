/**
 * @cloudwerk/utils - HTML Utilities
 *
 * Utilities for safe HTML handling.
 * These functions are browser-safe and have no Node.js dependencies.
 */

/**
 * Escape a string for safe use in an HTML attribute.
 *
 * This function escapes characters that could break out of an HTML attribute
 * or cause XSS vulnerabilities.
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in HTML attributes
 *
 * @example
 * ```typescript
 * escapeHtmlAttribute('Hello "World"') // => 'Hello &quot;World&quot;'
 * escapeHtmlAttribute('<script>') // => '&lt;script&gt;'
 * ```
 */
export function escapeHtmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
