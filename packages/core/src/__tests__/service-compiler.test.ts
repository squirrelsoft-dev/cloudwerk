import { describe, it, expect } from 'vitest'
import {
  compileService,
  buildServiceManifest,
  updateServiceEntryFromDefinition,
  addServiceWarnings,
  formatServiceErrors,
  formatServiceWarnings,
  hasServiceErrors,
  hasServiceWarnings,
} from '../service-compiler.js'
import type { ScannedService, ServiceScanResult } from '../service-scanner.js'

describe('service-compiler', () => {
  describe('compileService', () => {
    it('should compile a scanned service to an entry', () => {
      const scannedService: ScannedService = {
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      }

      const entry = compileService(scannedService)

      expect(entry.name).toBe('email')
      expect(entry.bindingName).toBe('EMAIL_SERVICE')
      expect(entry.workerName).toBe('email-service')
      expect(entry.entrypointClass).toBe('EmailService')
      expect(entry.filePath).toBe('email/service.ts')
      expect(entry.mode).toBe('local')
      expect(entry.methodNames).toEqual([])
      expect(entry.requiredBindings).toEqual([])
      expect(entry.hasHooks).toBe(false)
    })

    it('should use extracted mode when specified', () => {
      const scannedService: ScannedService = {
        name: 'payments',
        relativePath: 'payments/service.ts',
        absolutePath: '/app/services/payments/service.ts',
        directoryName: 'payments',
        extension: '.ts',
      }

      const entry = compileService(scannedService, 'extracted')

      expect(entry.mode).toBe('extracted')
    })

    it('should handle camelCase names correctly', () => {
      const scannedService: ScannedService = {
        name: 'userManagement',
        relativePath: 'user-management/service.ts',
        absolutePath: '/app/services/user-management/service.ts',
        directoryName: 'user-management',
        extension: '.ts',
      }

      const entry = compileService(scannedService)

      expect(entry.name).toBe('userManagement')
      expect(entry.bindingName).toBe('USER_MANAGEMENT_SERVICE')
      expect(entry.workerName).toBe('user-management-service')
      expect(entry.entrypointClass).toBe('UserManagementService')
    })
  })

  describe('buildServiceManifest', () => {
    it('should build manifest from scan result', () => {
      const scanResult: ServiceScanResult = {
        services: [
          {
            name: 'email',
            relativePath: 'email/service.ts',
            absolutePath: '/app/services/email/service.ts',
            directoryName: 'email',
            extension: '.ts',
          },
          {
            name: 'payments',
            relativePath: 'payments/service.ts',
            absolutePath: '/app/services/payments/service.ts',
            directoryName: 'payments',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildServiceManifest(scanResult, '/app')

      expect(manifest.services).toHaveLength(2)
      expect(manifest.errors).toHaveLength(0)
      expect(manifest.rootDir).toBe('/app')
      expect(manifest.generatedAt).toBeInstanceOf(Date)
    })

    it('should apply per-service mode overrides', () => {
      const scanResult: ServiceScanResult = {
        services: [
          {
            name: 'email',
            relativePath: 'email/service.ts',
            absolutePath: '/app/services/email/service.ts',
            directoryName: 'email',
            extension: '.ts',
          },
          {
            name: 'payments',
            relativePath: 'payments/service.ts',
            absolutePath: '/app/services/payments/service.ts',
            directoryName: 'payments',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildServiceManifest(scanResult, '/app', {
        defaultMode: 'local',
        serviceModes: { email: 'extracted' },
      })

      const emailService = manifest.services.find((s) => s.name === 'email')
      const paymentsService = manifest.services.find((s) => s.name === 'payments')

      expect(emailService?.mode).toBe('extracted')
      expect(paymentsService?.mode).toBe('local')
    })

    it('should detect duplicate service names', () => {
      const scanResult: ServiceScanResult = {
        services: [
          {
            name: 'email',
            relativePath: 'email/service.ts',
            absolutePath: '/app/services/email/service.ts',
            directoryName: 'email',
            extension: '.ts',
          },
          {
            name: 'email', // Duplicate
            relativePath: 'email-v2/service.ts',
            absolutePath: '/app/services/email-v2/service.ts',
            directoryName: 'email-v2',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildServiceManifest(scanResult, '/app')

      expect(manifest.services).toHaveLength(1)
      expect(manifest.errors).toHaveLength(1)
      expect(manifest.errors[0].code).toBe('DUPLICATE_NAME')
    })

    it('should return empty manifest for empty scan result', () => {
      const scanResult: ServiceScanResult = {
        services: [],
      }

      const manifest = buildServiceManifest(scanResult, '/app')

      expect(manifest.services).toHaveLength(0)
      expect(manifest.errors).toHaveLength(0)
      expect(manifest.warnings).toHaveLength(0)
    })
  })

  describe('updateServiceEntryFromDefinition', () => {
    it('should update entry with method names', () => {
      const entry = compileService({
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      })

      const updated = updateServiceEntryFromDefinition(entry, {
        methods: {
          send: async () => {},
          sendBatch: async () => {},
        },
      })

      expect(updated.methodNames).toEqual(['send', 'sendBatch'])
    })

    it('should update entry with hooks info', () => {
      const entry = compileService({
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      })

      const updated = updateServiceEntryFromDefinition(entry, {
        methods: { send: async () => {} },
        hooks: {
          onInit: async () => {},
          onError: async () => {},
        },
      })

      expect(updated.hasHooks).toBe(true)
    })

    it('should update entry with required bindings', () => {
      const entry = compileService({
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      })

      const updated = updateServiceEntryFromDefinition(entry, {
        methods: { send: async () => {} },
        config: {
          extraction: {
            bindings: ['RESEND_API_KEY', 'DB'],
          },
        },
      })

      expect(updated.requiredBindings).toEqual(['RESEND_API_KEY', 'DB'])
    })

    it('should use custom worker name from config', () => {
      const entry = compileService({
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      })

      const updated = updateServiceEntryFromDefinition(entry, {
        methods: { send: async () => {} },
        config: {
          extraction: {
            workerName: 'custom-email-worker',
          },
        },
      })

      expect(updated.workerName).toBe('custom-email-worker')
    })

    it('should use explicit service name if provided', () => {
      const entry = compileService({
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      })

      const updated = updateServiceEntryFromDefinition(entry, {
        name: 'emailer',
        methods: { send: async () => {} },
      })

      expect(updated.name).toBe('emailer')
    })
  })

  describe('addServiceWarnings', () => {
    it('should warn about empty methods', () => {
      const entry = compileService({
        name: 'email',
        relativePath: 'email/service.ts',
        absolutePath: '/app/services/email/service.ts',
        directoryName: 'email',
        extension: '.ts',
      })

      const warnings: Parameters<typeof addServiceWarnings>[1] = []
      addServiceWarnings(entry, warnings)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].code).toBe('EMPTY_METHODS')
    })

    it('should warn about extracted service without hooks', () => {
      const entry = compileService(
        {
          name: 'email',
          relativePath: 'email/service.ts',
          absolutePath: '/app/services/email/service.ts',
          directoryName: 'email',
          extension: '.ts',
        },
        'extracted'
      )
      entry.methodNames = ['send']

      const warnings: Parameters<typeof addServiceWarnings>[1] = []
      addServiceWarnings(entry, warnings)

      const noHooksWarning = warnings.find((w) => w.code === 'NO_HOOKS')
      expect(noHooksWarning).toBeDefined()
    })

    it('should warn about extracted service without bindings', () => {
      const entry = compileService(
        {
          name: 'email',
          relativePath: 'email/service.ts',
          absolutePath: '/app/services/email/service.ts',
          directoryName: 'email',
          extension: '.ts',
        },
        'extracted'
      )
      entry.methodNames = ['send']
      entry.hasHooks = true

      const warnings: Parameters<typeof addServiceWarnings>[1] = []
      addServiceWarnings(entry, warnings)

      const missingBindingsWarning = warnings.find((w) => w.code === 'MISSING_BINDINGS')
      expect(missingBindingsWarning).toBeDefined()
    })
  })

  describe('formatServiceErrors', () => {
    it('should format errors as string', () => {
      const result = formatServiceErrors([
        { file: 'email/service.ts', message: 'No methods', code: 'NO_METHODS' },
        { file: 'payments/service.ts', message: 'Invalid name', code: 'INVALID_NAME' },
      ])

      expect(result).toContain('email/service.ts')
      expect(result).toContain('No methods')
      expect(result).toContain('payments/service.ts')
      expect(result).toContain('Invalid name')
    })

    it('should return empty string for no errors', () => {
      const result = formatServiceErrors([])
      expect(result).toBe('')
    })
  })

  describe('formatServiceWarnings', () => {
    it('should format warnings as string', () => {
      const result = formatServiceWarnings([
        { file: 'email/service.ts', message: 'No hooks', code: 'NO_HOOKS' },
      ])

      expect(result).toContain('email/service.ts')
      expect(result).toContain('No hooks')
    })

    it('should return empty string for no warnings', () => {
      const result = formatServiceWarnings([])
      expect(result).toBe('')
    })
  })

  describe('hasServiceErrors', () => {
    it('should return true if manifest has errors', () => {
      const manifest = {
        services: [],
        errors: [{ file: 'test', message: 'error', code: 'NO_METHODS' as const }],
        warnings: [],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasServiceErrors(manifest)).toBe(true)
    })

    it('should return false if manifest has no errors', () => {
      const manifest = {
        services: [],
        errors: [],
        warnings: [],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasServiceErrors(manifest)).toBe(false)
    })
  })

  describe('hasServiceWarnings', () => {
    it('should return true if manifest has warnings', () => {
      const manifest = {
        services: [],
        errors: [],
        warnings: [{ file: 'test', message: 'warning', code: 'NO_HOOKS' as const }],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasServiceWarnings(manifest)).toBe(true)
    })

    it('should return false if manifest has no warnings', () => {
      const manifest = {
        services: [],
        errors: [],
        warnings: [],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasServiceWarnings(manifest)).toBe(false)
    })
  })
})
