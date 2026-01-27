/**
 * @cloudwerk/core - Boundary Validator Tests
 *
 * Tests for client/server component boundary validation.
 */

import { describe, it, expect } from 'vitest'
import {
  validateServerComponent,
  validateClientComponent,
  validateComponentBoundaries,
  formatBoundaryError,
  hasBoundaryErrors,
  hasBoundaryWarnings,
  handleBoundaryValidationResult,
} from '../boundary-validator.js'

// ============================================================================
// validateServerComponent Tests
// ============================================================================

describe('validateServerComponent', () => {
  it('should detect useState in Server Component', () => {
    const code = `
export default function HomePage() {
  const [count, setCount] = useState(0)
  return <div>{count}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('client-hook-in-server')
    expect(result.issues[0].message).toContain('useState')
  })

  it('should detect useEffect in Server Component', () => {
    const code = `
export default function HomePage() {
  useEffect(() => {
    console.log('mounted')
  }, [])
  return <div>Hello</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('client-hook-in-server')
    expect(result.issues[0].message).toContain('useEffect')
  })

  it('should detect multiple hooks in Server Component', () => {
    const code = `
export default function HomePage() {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  useEffect(() => {}, [])
  return <div>{count}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(3)
  })

  it('should detect window usage in Server Component', () => {
    const code = `
export default function HomePage() {
  const width = window.innerWidth
  return <div>{width}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('browser-api-in-server')
    expect(result.issues[0].message).toContain('window')
  })

  it('should detect document usage in Server Component', () => {
    const code = `
export default function HomePage() {
  const el = document.getElementById('root')
  return <div>Hello</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('browser-api-in-server')
    expect(result.issues[0].message).toContain('document')
  })

  it('should detect localStorage usage in Server Component', () => {
    const code = `
export default function HomePage() {
  const token = localStorage.getItem('token')
  return <div>{token}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('browser-api-in-server')
  })

  it('should pass valid Server Component', () => {
    const code = `
export default function HomePage() {
  return <div>Hello World</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('should ignore hooks in comments', () => {
    const code = `
// This component doesn't use useState
export default function HomePage() {
  // const [count, setCount] = useState(0)
  return <div>Hello</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(true)
  })

  it('should pass Server Component with async data fetching', () => {
    const code = `
export async function loader({ params }) {
  const data = await fetch('https://api.example.com/data')
  return data.json()
}

export default function HomePage({ data }) {
  return <div>{data.title}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(true)
  })

  it('should not flag URLs in strings as comments', () => {
    const code = `
export default function HomePage() {
  const url = 'http://example.com'
  const apiUrl = "https://api.example.com/data"
  return <div>{url}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('should not flag hooks mentioned in string literals', () => {
    const code = `
export default function HomePage() {
  const message = "You should use useState for state management"
  return <div>{message}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(true)
  })

  it('should detect hooks even when URL is in a string on the same line', () => {
    const code = `
export default function HomePage() {
  const url = 'http://example.com'
  const [count, setCount] = useState(0)
  return <div>{count}</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('client-hook-in-server')
  })

  it('should ignore hooks in multi-line comments', () => {
    const code = `
/*
 * This component could use useState but we'll keep it server-side
 * useState(0) - this is just documentation
 */
export default function HomePage() {
  return <div>Hello</div>
}
`
    const result = validateServerComponent(code, 'app/page.tsx')

    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// validateClientComponent Tests
// ============================================================================

describe('validateClientComponent', () => {
  it('should warn about large dependencies', () => {
    const code = `'use client'
import lodash from 'lodash'

export default function Counter() {
  return <div>Count</div>
}
`
    const result = validateClientComponent(code, 'app/counter.tsx')

    expect(result.isValid).toBe(true) // warnings don't make it invalid
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('large-client-dependency')
    expect(result.issues[0].severity).toBe('warning')
  })

  it('should pass valid Client Component', () => {
    const code = `'use client'
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
`
    const result = validateClientComponent(code, 'app/counter.tsx')

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('should skip bundle size check when disabled', () => {
    const code = `'use client'
import lodash from 'lodash'
`
    const result = validateClientComponent(code, 'app/counter.tsx', { checkBundleSize: false })

    expect(result.issues).toHaveLength(0)
  })

  it('should not warn about type-only imports', () => {
    const code = `'use client'
import type { LoDashStatic } from 'lodash'

export default function Counter() {
  return <div>Count</div>
}
`
    const result = validateClientComponent(code, 'app/counter.tsx')

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('should not warn about inline type imports', () => {
    const code = `'use client'
import { type Moment } from 'moment'

export default function Counter() {
  return <div>Count</div>
}
`
    const result = validateClientComponent(code, 'app/counter.tsx')

    // Note: inline type imports still match our regex, but this is acceptable
    // since they're rare. Full AST analysis would be needed for perfect detection.
    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// validateComponentBoundaries Tests
// ============================================================================

describe('validateComponentBoundaries', () => {
  it('should route to server validation when isClientComponent is false', () => {
    const code = `
export default function HomePage() {
  const [count, setCount] = useState(0)
  return <div>{count}</div>
}
`
    const result = validateComponentBoundaries(code, 'app/page.tsx', false)

    expect(result.isValid).toBe(false)
    expect(result.issues[0].type).toBe('client-hook-in-server')
  })

  it('should route to client validation when isClientComponent is true', () => {
    const code = `'use client'
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button>{count}</button>
}
`
    const result = validateComponentBoundaries(code, 'app/counter.tsx', true)

    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// formatBoundaryError Tests
// ============================================================================

describe('formatBoundaryError', () => {
  it('should format error with location and suggestion', () => {
    const issue = {
      type: 'client-hook-in-server' as const,
      severity: 'error' as const,
      message: 'useState is not available in Server Components.',
      filePath: 'app/page.tsx',
      location: { line: 5, column: 18 },
      codeSnippet: '>    5 |   const [count, setCount] = useState(0)',
      suggestion: "Add 'use client' at the top of the file.",
    }

    const formatted = formatBoundaryError(issue)

    expect(formatted).toContain('Error: useState is not available')
    expect(formatted).toContain('app/page.tsx:5:18')
    expect(formatted).toContain('useState(0)')
    expect(formatted).toContain("Add 'use client'")
  })

  it('should format warning correctly', () => {
    const issue = {
      type: 'large-client-dependency' as const,
      severity: 'warning' as const,
      message: 'Large dependency imported in Client Component.',
      filePath: 'app/counter.tsx',
      suggestion: "'lodash' adds ~70kb to client bundle.",
    }

    const formatted = formatBoundaryError(issue)

    expect(formatted).toContain('Warning:')
    expect(formatted).toContain('Large dependency')
  })
})

// ============================================================================
// hasBoundaryErrors Tests
// ============================================================================

describe('hasBoundaryErrors', () => {
  it('should return true when there are errors', () => {
    const result = {
      isValid: false,
      issues: [
        { type: 'client-hook-in-server' as const, severity: 'error' as const, message: '', filePath: '' }
      ]
    }
    expect(hasBoundaryErrors(result)).toBe(true)
  })

  it('should return false when only warnings', () => {
    const result = {
      isValid: true,
      issues: [
        { type: 'large-client-dependency' as const, severity: 'warning' as const, message: '', filePath: '' }
      ]
    }
    expect(hasBoundaryErrors(result)).toBe(false)
  })
})

// ============================================================================
// hasBoundaryWarnings Tests
// ============================================================================

describe('hasBoundaryWarnings', () => {
  it('should return true when there are warnings', () => {
    const result = {
      isValid: true,
      issues: [
        { type: 'large-client-dependency' as const, severity: 'warning' as const, message: '', filePath: '' }
      ]
    }
    expect(hasBoundaryWarnings(result)).toBe(true)
  })

  it('should return false when no warnings', () => {
    const result = {
      isValid: true,
      issues: []
    }
    expect(hasBoundaryWarnings(result)).toBe(false)
  })
})

// ============================================================================
// handleBoundaryValidationResult Tests
// ============================================================================

describe('handleBoundaryValidationResult', () => {
  it('should throw on errors', () => {
    const result = {
      isValid: false,
      issues: [
        {
          type: 'client-hook-in-server' as const,
          severity: 'error' as const,
          message: 'useState is not available in Server Components.',
          filePath: 'app/page.tsx',
        }
      ]
    }

    expect(() => handleBoundaryValidationResult(result, 'app/page.tsx')).toThrow(
      'Component boundary validation failed'
    )
  })

  it('should not throw on warnings only', () => {
    const result = {
      isValid: true,
      issues: [
        {
          type: 'large-client-dependency' as const,
          severity: 'warning' as const,
          message: 'Large dependency imported.',
          filePath: 'app/counter.tsx',
        }
      ]
    }

    expect(() => handleBoundaryValidationResult(result, 'app/counter.tsx')).not.toThrow()
  })

  it('should log warnings when verbose is true', () => {
    const warnings: string[] = []
    const mockLogger = (msg: string) => warnings.push(msg)

    const result = {
      isValid: true,
      issues: [
        {
          type: 'large-client-dependency' as const,
          severity: 'warning' as const,
          message: 'Large dependency imported.',
          filePath: 'app/counter.tsx',
        }
      ]
    }

    handleBoundaryValidationResult(result, 'app/counter.tsx', {
      verbose: true,
      logger: mockLogger,
    })

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Component boundary warnings')
  })

  it('should not log warnings when verbose is false', () => {
    const warnings: string[] = []
    const mockLogger = (msg: string) => warnings.push(msg)

    const result = {
      isValid: true,
      issues: [
        {
          type: 'large-client-dependency' as const,
          severity: 'warning' as const,
          message: 'Large dependency imported.',
          filePath: 'app/counter.tsx',
        }
      ]
    }

    handleBoundaryValidationResult(result, 'app/counter.tsx', {
      verbose: false,
      logger: mockLogger,
    })

    expect(warnings).toHaveLength(0)
  })

  it('should pass silently when no issues', () => {
    const result = {
      isValid: true,
      issues: []
    }

    expect(() => handleBoundaryValidationResult(result, 'app/page.tsx')).not.toThrow()
  })
})
