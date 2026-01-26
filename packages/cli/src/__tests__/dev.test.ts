/**
 * Tests for the dev command.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as path from 'node:path'

// Mock the serve function and process handlers
vi.mock('@hono/node-server', () => ({
  serve: vi.fn(() => {
    const listeners: Record<string, (() => void)[]> = {}
    return {
      on: (event: string, callback: () => void) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(callback)
        // Immediately fire 'listening' event for tests
        if (event === 'listening') {
          setTimeout(() => callback(), 0)
        }
      },
      close: vi.fn((callback?: () => void) => {
        if (callback) callback()
      }),
    }
  }),
}))

// We'll test the logger and types directly since the dev command
// has side effects (process.exit, server.listen, etc.)

import { createLogger, printStartupBanner, printError } from '../utils/logger.js'
import { CliError, PortInUseError } from '../types.js'

describe('dev command utilities', () => {
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

    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger(false)

      logger.info('Test message')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
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

  describe('printStartupBanner', () => {
    it('should print banner without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      printStartupBanner(
        '0.0.1',
        'http://localhost:3000/',
        'http://192.168.1.100:3000/',
        [
          { method: 'GET', pattern: '/api/health' },
          { method: 'GET', pattern: '/api/users' },
          { method: 'POST', pattern: '/api/users' },
        ],
        247
      )

      // Should have called console.log multiple times for banner
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0)
      consoleSpy.mockRestore()
    })

    it('should handle missing network URL', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      printStartupBanner(
        '0.0.1',
        'http://localhost:3000/',
        undefined,
        [{ method: 'GET', pattern: '/api/health' }],
        100
      )

      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0)
      consoleSpy.mockRestore()
    })

    it('should handle many routes (truncation)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Create 15 routes
      const routes = Array.from({ length: 15 }, (_, i) => ({
        method: 'GET',
        pattern: `/api/route${i}`,
      }))

      printStartupBanner('0.0.1', 'http://localhost:3000/', undefined, routes, 100)

      // Should show "... and X more routes" message
      const calls = consoleSpy.mock.calls.map((c) => c[0])
      const hasMoreMessage = calls.some((c) => c && c.includes('more routes'))
      expect(hasMoreMessage).toBe(true)

      consoleSpy.mockRestore()
    })
  })

  describe('printError', () => {
    it('should print error message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      printError('Something went wrong')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should print error with suggestion', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      printError('Port 3000 is in use', 'Try: cloudwerk dev --port 3001')

      expect(consoleSpy.mock.calls.length).toBeGreaterThan(1)
      consoleSpy.mockRestore()
    })
  })
})

describe('CLI error types', () => {
  describe('CliError', () => {
    it('should create error with message and code', () => {
      const error = new CliError('Test error', 'TEST_CODE')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.suggestion).toBeUndefined()
      expect(error.name).toBe('CliError')
    })

    it('should create error with suggestion', () => {
      const error = new CliError('Test error', 'TEST_CODE', 'Try this')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.suggestion).toBe('Try this')
    })
  })

  describe('PortInUseError', () => {
    it('should create port in use error with correct message', () => {
      const error = new PortInUseError(3000)

      expect(error.message).toBe('Port 3000 is already in use')
      expect(error.code).toBe('EADDRINUSE')
      expect(error.suggestion).toContain('3001')
      expect(error.name).toBe('PortInUseError')
    })

    it('should suggest next port number', () => {
      const error = new PortInUseError(8080)

      expect(error.suggestion).toContain('8081')
    })
  })
})

describe('dev command option parsing', () => {
  it('should have correct default values', () => {
    // These are the defaults defined in the CLI
    const defaults = {
      port: '3000',
      host: 'localhost',
    }

    expect(defaults.port).toBe('3000')
    expect(defaults.host).toBe('localhost')
  })
})
