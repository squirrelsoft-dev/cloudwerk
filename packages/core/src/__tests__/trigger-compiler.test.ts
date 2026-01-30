/**
 * Tests for trigger-compiler.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { scanTriggersSync, TRIGGERS_DIR } from '../trigger-scanner.js'
import {
  compileTrigger,
  buildTriggerManifest,
  updateTriggerEntryFromDefinition,
  formatTriggerErrors,
  formatTriggerWarnings,
  hasTriggerErrors,
  hasTriggerWarnings,
  getTriggerSummary,
  populateTriggerGroups,
} from '../trigger-compiler.js'
import type { ScannedTrigger } from '../trigger-scanner.js'

describe('compileTrigger', () => {
  it('compiles a scanned trigger to an entry', () => {
    const scanned: ScannedTrigger = {
      relativePath: 'daily-cleanup.ts',
      absolutePath: '/app/triggers/daily-cleanup.ts',
      name: 'daily-cleanup',
      extension: '.ts',
    }

    const entry = compileTrigger(scanned)

    expect(entry.name).toBe('dailyCleanup')
    expect(entry.bindingName).toBe('DAILY_CLEANUP_TRIGGER')
    expect(entry.filePath).toBe('daily-cleanup.ts')
    expect(entry.absolutePath).toBe('/app/triggers/daily-cleanup.ts')
    expect(entry.hasOnError).toBe(false)
    expect(entry.fanOutGroup).toBeUndefined()
  })

  it('preserves fan-out group', () => {
    const scanned: ScannedTrigger = {
      relativePath: 'uploads/process.ts',
      absolutePath: '/app/triggers/uploads/process.ts',
      name: 'process',
      extension: '.ts',
      fanOutGroup: 'uploads',
    }

    const entry = compileTrigger(scanned)

    expect(entry.fanOutGroup).toBe('uploads')
  })

  it('applies default config', () => {
    const scanned: ScannedTrigger = {
      relativePath: 'cleanup.ts',
      absolutePath: '/app/triggers/cleanup.ts',
      name: 'cleanup',
      extension: '.ts',
    }

    const entry = compileTrigger(scanned)

    expect(entry.retry).toEqual({
      maxAttempts: 3,
      delay: '1m',
      backoff: 'linear',
    })
    expect(entry.timeout).toBe(30000)
  })
})

describe('buildTriggerManifest', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trigger-compiler-test-'))
    fs.mkdirSync(path.join(tempDir, TRIGGERS_DIR), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('builds a manifest from scan results', () => {
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'daily-cleanup.ts'),
      'export default {}'
    )

    const scanResult = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })
    const manifest = buildTriggerManifest(scanResult, tempDir)

    expect(manifest.triggers).toHaveLength(1)
    expect(manifest.triggers[0].name).toBe('dailyCleanup')
    expect(manifest.rootDir).toBe(tempDir)
    expect(manifest.generatedAt).toBeInstanceOf(Date)
  })

  it('detects duplicate names', () => {
    // This would require two files that normalize to the same name
    // Since we can't have daily_cleanup.ts and daily-cleanup.ts in the same directory,
    // we'll test this differently
    const scanResult = {
      triggers: [
        {
          relativePath: 'cleanup.ts',
          absolutePath: '/app/triggers/cleanup.ts',
          name: 'cleanup',
          extension: '.ts' as const,
        },
        {
          relativePath: 'subdir/cleanup.ts',
          absolutePath: '/app/triggers/subdir/cleanup.ts',
          name: 'cleanup',
          extension: '.ts' as const,
          fanOutGroup: 'subdir',
        },
      ],
      fanOutGroups: new Map([['subdir', ['cleanup']]]),
    }

    const manifest = buildTriggerManifest(scanResult, tempDir)

    expect(manifest.errors).toHaveLength(1)
    expect(manifest.errors[0].code).toBe('DUPLICATE_NAME')
  })

  it('adds warning for missing error handler', () => {
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'cleanup.ts'),
      'export default {}'
    )

    const scanResult = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })
    const manifest = buildTriggerManifest(scanResult, tempDir)

    expect(manifest.warnings.some((w) => w.code === 'NO_ERROR_HANDLER')).toBe(
      true
    )
  })

  it('groups fan-out triggers', () => {
    fs.mkdirSync(path.join(tempDir, TRIGGERS_DIR, 'uploads'), {
      recursive: true,
    })
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'uploads', 'process-a.ts'),
      'export default {}'
    )
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'uploads', 'process-b.ts'),
      'export default {}'
    )

    const scanResult = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })
    const manifest = buildTriggerManifest(scanResult, tempDir)

    expect(manifest.fanOutGroups.get('uploads')?.length).toBe(2)
  })
})

describe('updateTriggerEntryFromDefinition', () => {
  it('updates entry with loaded definition', () => {
    const entry = compileTrigger({
      relativePath: 'cleanup.ts',
      absolutePath: '/app/triggers/cleanup.ts',
      name: 'cleanup',
      extension: '.ts',
    })

    const updated = updateTriggerEntryFromDefinition(entry, {
      source: { type: 'scheduled', cron: '0 0 * * *' },
      retry: { maxAttempts: 5 },
      timeout: 60000,
      onError: async () => {},
    })

    expect(updated.source?.type).toBe('scheduled')
    expect(updated.retry?.maxAttempts).toBe(5)
    expect(updated.timeout).toBe(60000)
    expect(updated.hasOnError).toBe(true)
  })

  it('uses explicit name from definition', () => {
    const entry = compileTrigger({
      relativePath: 'cleanup.ts',
      absolutePath: '/app/triggers/cleanup.ts',
      name: 'cleanup',
      extension: '.ts',
    })

    const updated = updateTriggerEntryFromDefinition(entry, {
      name: 'my-cleanup',
      source: { type: 'scheduled', cron: '0 0 * * *' },
    })

    expect(updated.name).toBe('my-cleanup')
  })
})

describe('populateTriggerGroups', () => {
  it('groups scheduled triggers by cron', () => {
    const manifest = buildTriggerManifest(
      { triggers: [], fanOutGroups: new Map() },
      '/app'
    )

    manifest.triggers = [
      {
        name: 'cleanup',
        bindingName: 'CLEANUP_TRIGGER',
        filePath: 'cleanup.ts',
        absolutePath: '/app/triggers/cleanup.ts',
        source: { type: 'scheduled', cron: '0 0 * * *' },
        hasOnError: false,
      },
      {
        name: 'backup',
        bindingName: 'BACKUP_TRIGGER',
        filePath: 'backup.ts',
        absolutePath: '/app/triggers/backup.ts',
        source: { type: 'scheduled', cron: '0 0 * * *' },
        hasOnError: false,
      },
    ]

    populateTriggerGroups(manifest)

    expect(manifest.scheduled.get('0 0 * * *')?.length).toBe(2)
  })

  it('groups queue triggers by queue name', () => {
    const manifest = buildTriggerManifest(
      { triggers: [], fanOutGroups: new Map() },
      '/app'
    )

    manifest.triggers = [
      {
        name: 'processEmails',
        bindingName: 'PROCESS_EMAILS_TRIGGER',
        filePath: 'process-emails.ts',
        absolutePath: '/app/triggers/process-emails.ts',
        source: { type: 'queue', queue: 'email-queue' },
        hasOnError: false,
      },
    ]

    populateTriggerGroups(manifest)

    expect(manifest.queues.get('email-queue')?.length).toBe(1)
  })

  it('maps webhook triggers by path', () => {
    const manifest = buildTriggerManifest(
      { triggers: [], fanOutGroups: new Map() },
      '/app'
    )

    manifest.triggers = [
      {
        name: 'stripeWebhook',
        bindingName: 'STRIPE_WEBHOOK_TRIGGER',
        filePath: 'stripe-webhook.ts',
        absolutePath: '/app/triggers/stripe-webhook.ts',
        source: { type: 'webhook', path: '/webhooks/stripe' },
        hasOnError: false,
      },
    ]

    populateTriggerGroups(manifest)

    expect(manifest.webhooks.get('/webhooks/stripe')?.name).toBe('stripeWebhook')
  })
})

describe('formatting utilities', () => {
  it('formats errors', () => {
    const errors = [
      { file: 'cleanup.ts', message: 'Invalid name', code: 'INVALID_NAME' as const },
    ]

    const formatted = formatTriggerErrors(errors)

    expect(formatted).toContain('Trigger validation errors:')
    expect(formatted).toContain('cleanup.ts')
    expect(formatted).toContain('Invalid name')
  })

  it('returns empty string for no errors', () => {
    expect(formatTriggerErrors([])).toBe('')
  })

  it('formats warnings', () => {
    const warnings = [
      {
        file: 'cleanup.ts',
        message: 'No error handler',
        code: 'NO_ERROR_HANDLER' as const,
      },
    ]

    const formatted = formatTriggerWarnings(warnings)

    expect(formatted).toContain('Trigger validation warnings:')
    expect(formatted).toContain('cleanup.ts')
  })
})

describe('hasTriggerErrors / hasTriggerWarnings', () => {
  it('detects errors', () => {
    const manifest = buildTriggerManifest(
      { triggers: [], fanOutGroups: new Map() },
      '/app'
    )
    manifest.errors.push({
      file: 'test.ts',
      message: 'Error',
      code: 'INVALID_NAME',
    })

    expect(hasTriggerErrors(manifest)).toBe(true)
  })

  it('detects warnings', () => {
    const manifest = buildTriggerManifest(
      { triggers: [], fanOutGroups: new Map() },
      '/app'
    )
    manifest.warnings.push({
      file: 'test.ts',
      message: 'Warning',
      code: 'NO_ERROR_HANDLER',
    })

    expect(hasTriggerWarnings(manifest)).toBe(true)
  })
})

describe('getTriggerSummary', () => {
  it('counts triggers by type', () => {
    const manifest = buildTriggerManifest(
      { triggers: [], fanOutGroups: new Map() },
      '/app'
    )

    manifest.triggers = [
      {
        name: 'scheduled1',
        bindingName: 'S1',
        filePath: 's1.ts',
        absolutePath: '/app/triggers/s1.ts',
        source: { type: 'scheduled', cron: '* * * * *' },
        hasOnError: false,
      },
      {
        name: 'scheduled2',
        bindingName: 'S2',
        filePath: 's2.ts',
        absolutePath: '/app/triggers/s2.ts',
        source: { type: 'scheduled', cron: '0 0 * * *' },
        hasOnError: false,
      },
      {
        name: 'queue1',
        bindingName: 'Q1',
        filePath: 'q1.ts',
        absolutePath: '/app/triggers/q1.ts',
        source: { type: 'queue', queue: 'test' },
        hasOnError: false,
      },
      {
        name: 'webhook1',
        bindingName: 'W1',
        filePath: 'w1.ts',
        absolutePath: '/app/triggers/w1.ts',
        source: { type: 'webhook', path: '/test' },
        hasOnError: false,
      },
    ]

    const summary = getTriggerSummary(manifest)

    expect(summary.total).toBe(4)
    expect(summary.scheduled).toBe(2)
    expect(summary.queue).toBe(1)
    expect(summary.webhook).toBe(1)
    expect(summary.r2).toBe(0)
  })
})
