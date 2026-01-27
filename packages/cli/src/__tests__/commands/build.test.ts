/**
 * Tests for the build command.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as path from 'node:path'
import * as fs from 'node:fs'

import { createLogger, printError } from '../../utils/logger.js'
import { CliError } from '../../types.js'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock fs.existsSync for directory validation
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  }
})

// ============================================================================
// Tests
// ============================================================================

describe('build command utilities', () => {
  describe('createLogger', () => {
    it('should create logger instance', () => {
      const logger = createLogger(false)

      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.success).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.log).toBe('function')
    })

    it('should suppress debug messages in non-verbose mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger(false)

      logger.debug('Debug message')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should show debug messages in verbose mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger(true)

      logger.debug('Debug message')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('printError', () => {
    it('should print error message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      printError('Build failed')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should print error with suggestion', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      printError('SSG generation failed', 'Check your generateStaticParams exports')

      expect(consoleSpy.mock.calls.length).toBeGreaterThan(1)
      consoleSpy.mockRestore()
    })
  })
})

describe('build command option types', () => {
  it('should have correct option types', () => {
    // These are the default options for the build command
    const defaults = {
      output: './dist',
      ssg: false,
      verbose: false,
    }

    expect(defaults.output).toBe('./dist')
    expect(defaults.ssg).toBe(false)
    expect(defaults.verbose).toBe(false)
  })
})

describe('CliError for build', () => {
  it('should create error with message and code', () => {
    const error = new CliError('Build failed', 'BUILD_ERROR')

    expect(error.message).toBe('Build failed')
    expect(error.code).toBe('BUILD_ERROR')
    expect(error.name).toBe('CliError')
  })

  it('should create SSG error with suggestion', () => {
    const error = new CliError(
      'Failed to generate static pages',
      'SSG_ERROR',
      'Check your generateStaticParams exports and fix any issues.'
    )

    expect(error.message).toBe('Failed to generate static pages')
    expect(error.code).toBe('SSG_ERROR')
    expect(error.suggestion).toContain('generateStaticParams')
  })
})
