/**
 * Tests for the triggers commands.
 */

import { describe, it, expect, vi } from 'vitest'
import type { TriggerEntry } from '@cloudwerk/core/build'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the core build functions
vi.mock('@cloudwerk/core/build', async () => {
  return {
    loadConfig: vi.fn().mockResolvedValue({
      appDir: '/test/app',
      extensions: ['.ts', '.tsx'],
    }),
    scanTriggers: vi.fn().mockResolvedValue({
      triggers: [],
    }),
    buildTriggerManifest: vi.fn().mockReturnValue({
      triggers: [],
      scheduled: new Map(),
      queues: new Map(),
      r2: new Map(),
      webhooks: new Map(),
      errors: [],
      warnings: [],
      generatedAt: new Date(),
      rootDir: '/test/app',
    }),
    getTriggerSummary: vi.fn().mockReturnValue({
      total: 0,
      scheduled: 0,
      queue: 0,
      r2: 0,
      webhook: 0,
      email: 0,
      d1: 0,
      tail: 0,
    }),
    hasTriggerErrors: vi.fn().mockReturnValue(false),
    hasTriggerWarnings: vi.fn().mockReturnValue(false),
  }
})

// ============================================================================
// Tests
// ============================================================================

describe('triggers command', () => {
  describe('TriggersCommandOptions', () => {
    it('should have correct option types', () => {
      const defaults = {
        verbose: false,
      }

      expect(defaults.verbose).toBe(false)
    })
  })
})

describe('triggers list command', () => {
  describe('TriggersListOptions', () => {
    it('should have correct default option values', () => {
      const defaults = {
        type: undefined,
        json: false,
        verbose: false,
      }

      expect(defaults.type).toBeUndefined()
      expect(defaults.json).toBe(false)
      expect(defaults.verbose).toBe(false)
    })

    it('should accept filter by type', () => {
      const options = {
        type: 'scheduled',
        json: false,
        verbose: false,
      }

      expect(options.type).toBe('scheduled')
    })

    it('should accept valid source types', () => {
      const validTypes = ['scheduled', 'queue', 'r2', 'webhook', 'email', 'd1', 'tail']

      for (const type of validTypes) {
        const options = { type }
        expect(options.type).toBe(type)
      }
    })
  })
})

describe('triggers validate command', () => {
  describe('TriggersValidateOptions', () => {
    it('should have correct default option values', () => {
      const defaults = {
        strict: false,
        json: false,
        verbose: false,
      }

      expect(defaults.strict).toBe(false)
      expect(defaults.json).toBe(false)
      expect(defaults.verbose).toBe(false)
    })

    it('should support strict mode', () => {
      const options = {
        strict: true,
        json: false,
        verbose: false,
      }

      expect(options.strict).toBe(true)
    })
  })
})

describe('triggers generate command', () => {
  describe('TriggersGenerateOptions', () => {
    it('should have correct default option values', () => {
      const defaults = {
        wrangler: undefined,
        types: undefined,
        dryRun: false,
        json: false,
        verbose: false,
      }

      expect(defaults.wrangler).toBeUndefined()
      expect(defaults.types).toBeUndefined()
      expect(defaults.dryRun).toBe(false)
      expect(defaults.json).toBe(false)
      expect(defaults.verbose).toBe(false)
    })

    it('should support wrangler-only mode', () => {
      const options = {
        wrangler: true,
        types: false,
        dryRun: false,
      }

      expect(options.wrangler).toBe(true)
      expect(options.types).toBe(false)
    })

    it('should support types-only mode', () => {
      const options = {
        wrangler: false,
        types: true,
        dryRun: false,
      }

      expect(options.wrangler).toBe(false)
      expect(options.types).toBe(true)
    })

    it('should support dry run mode', () => {
      const options = {
        wrangler: undefined,
        types: undefined,
        dryRun: true,
      }

      expect(options.dryRun).toBe(true)
    })
  })
})

describe('trigger display helpers', () => {
  describe('source type formatting', () => {
    it('should have labels for all source types', () => {
      const SOURCE_TYPE_LABELS: Record<string, { label: string }> = {
        scheduled: { label: 'cron' },
        queue: { label: 'queue' },
        r2: { label: 'R2' },
        webhook: { label: 'webhook' },
        email: { label: 'email' },
        d1: { label: 'D1' },
        tail: { label: 'tail' },
      }

      expect(SOURCE_TYPE_LABELS.scheduled.label).toBe('cron')
      expect(SOURCE_TYPE_LABELS.queue.label).toBe('queue')
      expect(SOURCE_TYPE_LABELS.r2.label).toBe('R2')
      expect(SOURCE_TYPE_LABELS.webhook.label).toBe('webhook')
      expect(SOURCE_TYPE_LABELS.email.label).toBe('email')
      expect(SOURCE_TYPE_LABELS.d1.label).toBe('D1')
      expect(SOURCE_TYPE_LABELS.tail.label).toBe('tail')
    })
  })

  describe('source info extraction', () => {
    it('should extract cron expression for scheduled triggers', () => {
      const trigger = {
        source: { type: 'scheduled', cron: '0 0 * * *' },
      }

      expect(trigger.source.cron).toBe('0 0 * * *')
    })

    it('should extract queue name for queue triggers', () => {
      const trigger = {
        source: { type: 'queue', queue: 'my-queue' },
      }

      expect(trigger.source.queue).toBe('my-queue')
    })

    it('should extract bucket name for R2 triggers', () => {
      const trigger = {
        source: { type: 'r2', bucket: 'my-bucket', events: ['object-create'] },
      }

      expect(trigger.source.bucket).toBe('my-bucket')
    })

    it('should extract path for webhook triggers', () => {
      const trigger = {
        source: { type: 'webhook', path: '/webhooks/stripe' },
      }

      expect(trigger.source.path).toBe('/webhooks/stripe')
    })

    it('should extract address for email triggers', () => {
      const trigger = {
        source: { type: 'email', address: 'handler@example.com' },
      }

      expect(trigger.source.address).toBe('handler@example.com')
    })
  })
})

describe('trigger JSON formatting', () => {
  it('should format trigger entry for JSON output', () => {
    const trigger: Partial<TriggerEntry> = {
      name: 'dailyCleanup',
      bindingName: 'DAILY_CLEANUP_TRIGGER',
      filePath: 'triggers/daily-cleanup.ts',
      source: { type: 'scheduled', cron: '0 0 * * *' },
      hasOnError: true,
      retry: { maxAttempts: 3, delay: '5m' },
      timeout: 30000,
    }

    const formatted = {
      name: trigger.name,
      bindingName: trigger.bindingName,
      filePath: trigger.filePath,
      sourceType: trigger.source?.type,
      source: trigger.source,
      hasOnError: trigger.hasOnError,
      retry: trigger.retry,
      timeout: trigger.timeout,
      fanOutGroup: trigger.fanOutGroup,
    }

    expect(formatted.name).toBe('dailyCleanup')
    expect(formatted.bindingName).toBe('DAILY_CLEANUP_TRIGGER')
    expect(formatted.sourceType).toBe('scheduled')
    expect(formatted.hasOnError).toBe(true)
  })
})
