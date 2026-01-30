import { describe, it, expect } from 'vitest'
import {
  compileQueue,
  buildQueueManifest,
  updateQueueEntryFromDefinition,
  formatQueueErrors,
  formatQueueWarnings,
  hasQueueErrors,
  hasQueueWarnings,
} from '../queue-compiler.js'
import type { ScannedQueue, QueueScanResult } from '../queue-scanner.js'

describe('queue-compiler', () => {
  describe('compileQueue', () => {
    it('should compile a scanned queue to a QueueEntry', () => {
      const scannedQueue: ScannedQueue = {
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      }

      const entry = compileQueue(scannedQueue)

      expect(entry.name).toBe('email')
      expect(entry.bindingName).toBe('EMAIL_QUEUE')
      expect(entry.queueName).toBe('cloudwerk-email')
      expect(entry.filePath).toBe('email.ts')
      expect(entry.absolutePath).toBe('/app/queues/email.ts')
    })

    it('should convert kebab-case filenames to camelCase names', () => {
      const scannedQueue: ScannedQueue = {
        relativePath: 'image-processing.ts',
        absolutePath: '/app/queues/image-processing.ts',
        name: 'image-processing',
        extension: '.ts',
      }

      const entry = compileQueue(scannedQueue)

      expect(entry.name).toBe('imageProcessing')
      expect(entry.bindingName).toBe('IMAGE_PROCESSING_QUEUE')
      expect(entry.queueName).toBe('cloudwerk-image-processing')
    })

    it('should use custom app name for queue name', () => {
      const scannedQueue: ScannedQueue = {
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      }

      const entry = compileQueue(scannedQueue, 'myapp')

      expect(entry.queueName).toBe('myapp-email')
    })

    it('should include default configuration', () => {
      const scannedQueue: ScannedQueue = {
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      }

      const entry = compileQueue(scannedQueue)

      expect(entry.config.batchSize).toBe(10)
      expect(entry.config.maxRetries).toBe(3)
      expect(entry.config.retryDelay).toBe('1m')
      expect(entry.config.batchTimeout).toBe('5s')
    })

    it('should set handler flags to false by default', () => {
      const scannedQueue: ScannedQueue = {
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      }

      const entry = compileQueue(scannedQueue)

      expect(entry.hasProcessBatch).toBe(false)
      expect(entry.hasOnError).toBe(false)
    })
  })

  describe('buildQueueManifest', () => {
    it('should build manifest from scan result', () => {
      const scanResult: QueueScanResult = {
        queues: [
          {
            relativePath: 'email.ts',
            absolutePath: '/app/queues/email.ts',
            name: 'email',
            extension: '.ts',
          },
          {
            relativePath: 'notifications.ts',
            absolutePath: '/app/queues/notifications.ts',
            name: 'notifications',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildQueueManifest(scanResult, '/app')

      expect(manifest.queues).toHaveLength(2)
      expect(manifest.rootDir).toBe('/app')
      expect(manifest.generatedAt).toBeInstanceOf(Date)
    })

    it('should detect duplicate queue names', () => {
      const scanResult: QueueScanResult = {
        queues: [
          {
            relativePath: 'email.ts',
            absolutePath: '/app/queues/email.ts',
            name: 'email',
            extension: '.ts',
          },
          {
            relativePath: 'email.tsx', // Same name, different extension
            absolutePath: '/app/queues/email.tsx',
            name: 'email',
            extension: '.tsx',
          },
        ],
      }

      const manifest = buildQueueManifest(scanResult, '/app')

      expect(manifest.queues).toHaveLength(1) // Only first one added
      expect(manifest.errors).toHaveLength(1)
      expect(manifest.errors[0].code).toBe('DUPLICATE_NAME')
    })

    it('should warn about missing DLQ', () => {
      const scanResult: QueueScanResult = {
        queues: [
          {
            relativePath: 'email.ts',
            absolutePath: '/app/queues/email.ts',
            name: 'email',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildQueueManifest(scanResult, '/app')

      expect(manifest.warnings).toHaveLength(1)
      expect(manifest.warnings[0].code).toBe('NO_DLQ')
    })

    it('should use custom app name', () => {
      const scanResult: QueueScanResult = {
        queues: [
          {
            relativePath: 'email.ts',
            absolutePath: '/app/queues/email.ts',
            name: 'email',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildQueueManifest(scanResult, '/app', { appName: 'myapp' })

      expect(manifest.queues[0].queueName).toBe('myapp-email')
    })
  })

  describe('updateQueueEntryFromDefinition', () => {
    it('should update entry with definition config', () => {
      const entry = compileQueue({
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      })

      const updated = updateQueueEntryFromDefinition(entry, {
        config: {
          batchSize: 20,
          maxRetries: 5,
          deadLetterQueue: 'email-dlq',
        },
        process: () => {},
        processBatch: () => {},
        onError: () => {},
      })

      expect(updated.config.batchSize).toBe(20)
      expect(updated.config.maxRetries).toBe(5)
      expect(updated.config.deadLetterQueue).toBe('email-dlq')
      expect(updated.hasProcessBatch).toBe(true)
      expect(updated.hasOnError).toBe(true)
    })

    it('should use explicit name from definition', () => {
      const entry = compileQueue({
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      })

      const updated = updateQueueEntryFromDefinition(entry, {
        name: 'custom-email',
        process: () => {},
      })

      expect(updated.name).toBe('custom-email')
    })

    it('should preserve entry name if definition has no name', () => {
      const entry = compileQueue({
        relativePath: 'email.ts',
        absolutePath: '/app/queues/email.ts',
        name: 'email',
        extension: '.ts',
      })

      const updated = updateQueueEntryFromDefinition(entry, {
        process: () => {},
      })

      expect(updated.name).toBe('email')
    })
  })

  describe('formatQueueErrors', () => {
    it('should return empty string for no errors', () => {
      expect(formatQueueErrors([])).toBe('')
    })

    it('should format errors as list', () => {
      const errors = [
        { file: 'email.ts', message: 'No handler', code: 'NO_HANDLER' as const },
        { file: 'queue.ts', message: 'Invalid config', code: 'INVALID_CONFIG' as const },
      ]

      const formatted = formatQueueErrors(errors)

      expect(formatted).toContain('Queue validation errors:')
      expect(formatted).toContain('email.ts: No handler')
      expect(formatted).toContain('queue.ts: Invalid config')
    })
  })

  describe('formatQueueWarnings', () => {
    it('should return empty string for no warnings', () => {
      expect(formatQueueWarnings([])).toBe('')
    })

    it('should format warnings as list', () => {
      const warnings = [
        { file: 'email.ts', message: 'No DLQ', code: 'NO_DLQ' as const },
        { file: 'queue.ts', message: 'Low retries', code: 'LOW_RETRIES' as const },
      ]

      const formatted = formatQueueWarnings(warnings)

      expect(formatted).toContain('Queue validation warnings:')
      expect(formatted).toContain('email.ts: No DLQ')
      expect(formatted).toContain('queue.ts: Low retries')
    })
  })

  describe('hasQueueErrors', () => {
    it('should return false for manifest with no errors', () => {
      const manifest = buildQueueManifest({ queues: [] }, '/app')
      expect(hasQueueErrors(manifest)).toBe(false)
    })

    it('should return true for manifest with errors', () => {
      const manifest = buildQueueManifest(
        {
          queues: [
            {
              relativePath: 'email.ts',
              absolutePath: '/app/queues/email.ts',
              name: 'email',
              extension: '.ts',
            },
            {
              relativePath: 'email.tsx',
              absolutePath: '/app/queues/email.tsx',
              name: 'email',
              extension: '.tsx',
            },
          ],
        },
        '/app'
      )

      expect(hasQueueErrors(manifest)).toBe(true)
    })
  })

  describe('hasQueueWarnings', () => {
    it('should return false for empty manifest', () => {
      const manifest = buildQueueManifest({ queues: [] }, '/app')
      expect(hasQueueWarnings(manifest)).toBe(false)
    })

    it('should return true for manifest with warnings', () => {
      const manifest = buildQueueManifest(
        {
          queues: [
            {
              relativePath: 'email.ts',
              absolutePath: '/app/queues/email.ts',
              name: 'email',
              extension: '.ts',
            },
          ],
        },
        '/app'
      )

      expect(hasQueueWarnings(manifest)).toBe(true) // NO_DLQ warning
    })
  })
})
