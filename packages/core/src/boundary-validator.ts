/**
 * @cloudwerk/core - Component Boundary Validator
 *
 * Validates client/server component boundaries to catch violations at build time.
 */

import type {
  BoundaryValidationIssue,
  BoundaryValidationResult,
  BoundaryValidationOptions,
} from './types.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * React hooks that require 'use client' directive.
 * These are only available in Client Components.
 */
const CLIENT_HOOKS = [
  'useState',
  'useEffect',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useContext',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useSyncExternalStore',
  'useTransition',
  'useDeferredValue',
  'useId',
] as const

/**
 * Browser APIs not available on the server.
 */
const BROWSER_APIS = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'history',
  'location',
  'alert',
  'confirm',
  'prompt',
] as const

/**
 * Known large dependencies that add significant bundle size.
 * Format: [package, approximate size in KB]
 */
const LARGE_DEPENDENCIES: [string, number][] = [
  ['lodash', 70],
  ['moment', 67],
  ['@mui/material', 200],
  ['antd', 250],
  ['chart.js', 60],
  ['three', 150],
]

// ============================================================================
// Regex Patterns
// ============================================================================

/**
 * Creates a regex to find hook usage in code.
 * Matches function calls like useState(), useEffect(() => ...), etc.
 */
function createHookRegex(hookName: string): RegExp {
  // Match hook calls: useState(...), useState<Type>(...)
  return new RegExp(
    `\\b${hookName}\\s*(?:<[^>]*>)?\\s*\\(`,
    'g'
  )
}

/**
 * Creates a regex to find browser API usage.
 * Matches: window.*, document.*, direct usage like localStorage.getItem
 */
function createBrowserApiRegex(apiName: string): RegExp {
  return new RegExp(
    `\\b${apiName}\\b(?:\\s*\\.|\\s*\\[|\\s*\\))`,
    'g'
  )
}

/**
 * Regex to find import statements.
 */
const IMPORT_REGEX = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the line number for a character position in code.
 */
function getLineNumber(code: string, position: number): number {
  const lines = code.slice(0, position).split('\n')
  return lines.length
}

/**
 * Get the column number for a character position in code.
 */
function getColumnNumber(code: string, position: number): number {
  const lastNewline = code.lastIndexOf('\n', position - 1)
  return position - lastNewline
}

/**
 * Get a code snippet around a position.
 */
function getCodeSnippet(code: string, position: number, contextLines: number = 1): string {
  const lines = code.split('\n')
  const lineIndex = getLineNumber(code, position) - 1

  const start = Math.max(0, lineIndex - contextLines)
  const end = Math.min(lines.length, lineIndex + contextLines + 1)

  return lines
    .slice(start, end)
    .map((line, i) => {
      const lineNum = start + i + 1
      const marker = lineNum === lineIndex + 1 ? '>' : ' '
      return `${marker} ${lineNum.toString().padStart(4)} | ${line}`
    })
    .join('\n')
}

/**
 * Check if a position is inside a comment or string.
 */
function isInCommentOrString(code: string, position: number): boolean {
  // Simple heuristic: check for common comment/string patterns before position
  const before = code.slice(Math.max(0, position - 100), position)

  // Check if we're in a single-line comment
  const lastNewline = before.lastIndexOf('\n')
  const lineStart = lastNewline === -1 ? 0 : lastNewline
  const currentLine = before.slice(lineStart)
  if (currentLine.includes('//')) {
    return true
  }

  // Check if we're in a multi-line comment (basic check)
  const lastCommentStart = before.lastIndexOf('/*')
  const lastCommentEnd = before.lastIndexOf('*/')
  if (lastCommentStart > lastCommentEnd) {
    return true
  }

  return false
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Detect hook usage in Server Components.
 */
function detectHooksInServerComponent(
  code: string,
  filePath: string
): BoundaryValidationIssue[] {
  const issues: BoundaryValidationIssue[] = []

  for (const hookName of CLIENT_HOOKS) {
    const regex = createHookRegex(hookName)
    let match: RegExpExecArray | null

    while ((match = regex.exec(code)) !== null) {
      if (isInCommentOrString(code, match.index)) {
        continue
      }

      const line = getLineNumber(code, match.index)
      const column = getColumnNumber(code, match.index)

      issues.push({
        type: 'client-hook-in-server',
        severity: 'error',
        message: `${hookName} is not available in Server Components.`,
        filePath,
        location: { line, column },
        codeSnippet: getCodeSnippet(code, match.index),
        suggestion: `Add 'use client' at the top of the file, or move the stateful logic to a Client Component.`,
      })
    }
  }

  return issues
}

/**
 * Detect browser API usage in Server Components.
 */
function detectBrowserApisInServerComponent(
  code: string,
  filePath: string
): BoundaryValidationIssue[] {
  const issues: BoundaryValidationIssue[] = []

  for (const apiName of BROWSER_APIS) {
    const regex = createBrowserApiRegex(apiName)
    let match: RegExpExecArray | null

    while ((match = regex.exec(code)) !== null) {
      if (isInCommentOrString(code, match.index)) {
        continue
      }

      const line = getLineNumber(code, match.index)
      const column = getColumnNumber(code, match.index)

      issues.push({
        type: 'browser-api-in-server',
        severity: 'error',
        message: `'${apiName}' is not available in Server Components.`,
        filePath,
        location: { line, column },
        codeSnippet: getCodeSnippet(code, match.index),
        suggestion: `'${apiName}' is only available in the browser. Move this code to a Client Component or use 'useEffect'.`,
      })
    }
  }

  return issues
}

/**
 * Detect large dependencies in Client Components.
 */
function detectLargeDependencies(
  code: string,
  filePath: string
): BoundaryValidationIssue[] {
  const issues: BoundaryValidationIssue[] = []

  let match: RegExpExecArray | null
  const importRegex = new RegExp(IMPORT_REGEX.source, 'g')

  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1]

    for (const [packageName, sizeKb] of LARGE_DEPENDENCIES) {
      if (importPath === packageName || importPath.startsWith(`${packageName}/`)) {
        const line = getLineNumber(code, match.index)
        const column = getColumnNumber(code, match.index)

        issues.push({
          type: 'large-client-dependency',
          severity: 'warning',
          message: `Large dependency imported in Client Component.`,
          filePath,
          location: { line, column },
          codeSnippet: getCodeSnippet(code, match.index),
          suggestion: `'${packageName}' adds ~${sizeKb}kb to client bundle. Consider importing specific functions or using a lighter alternative.`,
        })
      }
    }
  }

  return issues
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate a Server Component for boundary violations.
 *
 * Checks for:
 * - React hooks (useState, useEffect, etc.)
 * - Browser APIs (window, document, etc.)
 *
 * @param code - Source code of the component
 * @param filePath - File path for error reporting
 * @returns Validation result with any issues found
 */
export function validateServerComponent(
  code: string,
  filePath: string,
): BoundaryValidationResult {
  const issues: BoundaryValidationIssue[] = []

  // Check for hooks in server component
  issues.push(...detectHooksInServerComponent(code, filePath))

  // Check for browser APIs
  issues.push(...detectBrowserApisInServerComponent(code, filePath))

  const errors = issues.filter(i => i.severity === 'error')

  return {
    isValid: errors.length === 0,
    issues,
  }
}

/**
 * Validate a Client Component.
 *
 * Checks for:
 * - Large dependencies (warning)
 *
 * @param code - Source code of the component
 * @param filePath - File path for error reporting
 * @param options - Validation options
 * @returns Validation result with any issues found
 */
export function validateClientComponent(
  code: string,
  filePath: string,
  options: BoundaryValidationOptions = {},
): BoundaryValidationResult {
  const issues: BoundaryValidationIssue[] = []

  // Check for large dependencies
  if (options.checkBundleSize !== false) {
    issues.push(...detectLargeDependencies(code, filePath))
  }

  const errors = issues.filter(i => i.severity === 'error')

  return {
    isValid: errors.length === 0,
    issues,
  }
}

/**
 * Validate component boundaries based on whether it's a client or server component.
 *
 * This is the main entry point for boundary validation.
 *
 * @param code - Source code of the component
 * @param filePath - File path for error reporting
 * @param isClientComponent - Whether the component has 'use client' directive
 * @param options - Validation options
 * @returns Validation result with any issues found
 *
 * @example
 * ```typescript
 * import { hasUseClientDirective } from '@cloudwerk/core'
 * import { validateComponentBoundaries } from '@cloudwerk/core'
 *
 * const code = fs.readFileSync(filePath, 'utf-8')
 * const isClient = hasUseClientDirective(code)
 * const result = validateComponentBoundaries(code, filePath, isClient)
 *
 * if (!result.isValid) {
 *   for (const issue of result.issues) {
 *     console.error(formatBoundaryError(issue))
 *   }
 * }
 * ```
 */
export function validateComponentBoundaries(
  code: string,
  filePath: string,
  isClientComponent: boolean,
  options: BoundaryValidationOptions = {},
): BoundaryValidationResult {
  if (isClientComponent) {
    return validateClientComponent(code, filePath, options)
  } else {
    return validateServerComponent(code, filePath)
  }
}

/**
 * Format a boundary validation issue for display.
 *
 * Produces a formatted error message with location, code snippet, and suggestion.
 *
 * @param issue - The validation issue to format
 * @returns Formatted error string
 *
 * @example
 * ```
 * Error: useState is not available in Server Components.
 *
 *   app/routes/page.tsx:5:18
 *
 *     4 | export default function HomePage() {
 * >   5 |   const [count, setCount] = useState(0)
 *     6 |   return <div>{count}</div>
 *
 *   To fix this, add 'use client' at the top of the file, or move
 *   the stateful logic to a Client Component.
 * ```
 */
export function formatBoundaryError(issue: BoundaryValidationIssue): string {
  const parts: string[] = []

  // Severity and message
  const prefix = issue.severity === 'error' ? 'Error' : 'Warning'
  parts.push(`${prefix}: ${issue.message}`)
  parts.push('')

  // Location
  if (issue.location) {
    parts.push(`  ${issue.filePath}:${issue.location.line}:${issue.location.column}`)
    parts.push('')
  } else {
    parts.push(`  ${issue.filePath}`)
    parts.push('')
  }

  // Code snippet
  if (issue.codeSnippet) {
    const indented = issue.codeSnippet
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n')
    parts.push(indented)
    parts.push('')
  }

  // Suggestion
  if (issue.suggestion) {
    parts.push(`  ${issue.suggestion}`)
  }

  return parts.join('\n')
}

/**
 * Format multiple boundary validation issues.
 *
 * @param issues - Array of validation issues
 * @returns Formatted string with all issues
 */
export function formatBoundaryErrors(issues: BoundaryValidationIssue[]): string {
  if (issues.length === 0) {
    return 'No boundary validation issues found.'
  }

  return issues.map(formatBoundaryError).join('\n\n')
}

/**
 * Check if a validation result has any errors (not just warnings).
 *
 * @param result - Validation result to check
 * @returns True if there are errors
 */
export function hasBoundaryErrors(result: BoundaryValidationResult): boolean {
  return result.issues.some(i => i.severity === 'error')
}

/**
 * Check if a validation result has any warnings.
 *
 * @param result - Validation result to check
 * @returns True if there are warnings
 */
export function hasBoundaryWarnings(result: BoundaryValidationResult): boolean {
  return result.issues.some(i => i.severity === 'warning')
}
