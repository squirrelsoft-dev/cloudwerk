/**
 * Tests for trigger-scanner.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isTriggerFile,
  fileNameToTriggerName,
  triggerNameToBindingName,
  bindingNameToTriggerName,
  directoryNameToFanOutGroup,
  scanTriggersSync,
  TRIGGERS_DIR,
} from '../trigger-scanner.js'

describe('isTriggerFile', () => {
  it('accepts .ts files', () => {
    expect(isTriggerFile('daily-cleanup.ts')).toBe(true)
  })

  it('accepts .tsx files', () => {
    expect(isTriggerFile('process-uploads.tsx')).toBe(true)
  })

  it('accepts .js files', () => {
    expect(isTriggerFile('send-emails.js')).toBe(true)
  })

  it('accepts .jsx files', () => {
    expect(isTriggerFile('notify.jsx')).toBe(true)
  })

  it('rejects test files', () => {
    expect(isTriggerFile('daily-cleanup.test.ts')).toBe(false)
    expect(isTriggerFile('daily-cleanup.spec.ts')).toBe(false)
  })

  it('rejects type definition files', () => {
    expect(isTriggerFile('types.d.ts')).toBe(false)
  })

  it('rejects unsupported extensions', () => {
    expect(isTriggerFile('readme.md')).toBe(false)
    expect(isTriggerFile('config.json')).toBe(false)
  })
})

describe('fileNameToTriggerName', () => {
  it('converts kebab-case to camelCase', () => {
    expect(fileNameToTriggerName('daily-cleanup')).toBe('dailyCleanup')
    expect(fileNameToTriggerName('process-uploads')).toBe('processUploads')
    expect(fileNameToTriggerName('send-notification-emails')).toBe(
      'sendNotificationEmails'
    )
  })

  it('handles single-word names', () => {
    expect(fileNameToTriggerName('email')).toBe('email')
    expect(fileNameToTriggerName('cleanup')).toBe('cleanup')
  })

  it('preserves already camelCase names', () => {
    expect(fileNameToTriggerName('dailyCleanup')).toBe('dailyCleanup')
  })
})

describe('triggerNameToBindingName', () => {
  it('converts camelCase to SCREAMING_SNAKE_CASE with suffix', () => {
    expect(triggerNameToBindingName('dailyCleanup')).toBe('DAILY_CLEANUP_TRIGGER')
    expect(triggerNameToBindingName('processUploads')).toBe(
      'PROCESS_UPLOADS_TRIGGER'
    )
  })

  it('handles single-word names', () => {
    expect(triggerNameToBindingName('email')).toBe('EMAIL_TRIGGER')
  })
})

describe('bindingNameToTriggerName', () => {
  it('converts SCREAMING_SNAKE_CASE back to camelCase', () => {
    expect(bindingNameToTriggerName('DAILY_CLEANUP_TRIGGER')).toBe('dailyCleanup')
    expect(bindingNameToTriggerName('PROCESS_UPLOADS_TRIGGER')).toBe(
      'processUploads'
    )
    expect(bindingNameToTriggerName('EMAIL_TRIGGER')).toBe('email')
  })
})

describe('directoryNameToFanOutGroup', () => {
  it('converts directory names to group names', () => {
    expect(directoryNameToFanOutGroup('uploads')).toBe('uploads')
    expect(directoryNameToFanOutGroup('order-events')).toBe('orderEvents')
  })
})

describe('scanTriggersSync', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trigger-scanner-test-'))
    // Create triggers directory
    fs.mkdirSync(path.join(tempDir, TRIGGERS_DIR), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('scans trigger files', () => {
    // Create trigger files
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'daily-cleanup.ts'),
      'export default {}'
    )
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'process-uploads.ts'),
      'export default {}'
    )

    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers).toHaveLength(2)
    expect(result.triggers.map((t) => t.name).sort()).toEqual([
      'daily-cleanup',
      'process-uploads',
    ])
  })

  it('ignores test files', () => {
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'cleanup.ts'),
      'export default {}'
    )
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'cleanup.test.ts'),
      'test code'
    )

    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers).toHaveLength(1)
    expect(result.triggers[0].name).toBe('cleanup')
  })

  it('ignores index files', () => {
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'cleanup.ts'),
      'export default {}'
    )
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'index.ts'),
      'export * from "./cleanup"'
    )

    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers).toHaveLength(1)
  })

  it('detects fan-out subdirectories', () => {
    // Create fan-out group
    fs.mkdirSync(path.join(tempDir, TRIGGERS_DIR, 'uploads'), {
      recursive: true,
    })
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'uploads', 'generate-thumbnail.ts'),
      'export default {}'
    )
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'uploads', 'index-for-search.ts'),
      'export default {}'
    )

    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers).toHaveLength(2)
    expect(result.fanOutGroups.has('uploads')).toBe(true)
    expect(result.fanOutGroups.get('uploads')?.sort()).toEqual([
      'generate-thumbnail',
      'index-for-search',
    ])
  })

  it('sets fanOutGroup on scanned triggers', () => {
    fs.mkdirSync(path.join(tempDir, TRIGGERS_DIR, 'uploads'), {
      recursive: true,
    })
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'uploads', 'process.ts'),
      'export default {}'
    )

    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers[0].fanOutGroup).toBe('uploads')
  })

  it('handles empty triggers directory', () => {
    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers).toHaveLength(0)
    expect(result.fanOutGroups.size).toBe(0)
  })

  it('handles mixed flat and subdirectory triggers', () => {
    // Flat trigger
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'daily-cleanup.ts'),
      'export default {}'
    )

    // Fan-out group
    fs.mkdirSync(path.join(tempDir, TRIGGERS_DIR, 'uploads'), {
      recursive: true,
    })
    fs.writeFileSync(
      path.join(tempDir, TRIGGERS_DIR, 'uploads', 'process.ts'),
      'export default {}'
    )

    const result = scanTriggersSync(tempDir, { extensions: ['.ts', '.tsx'] })

    expect(result.triggers).toHaveLength(2)

    const flatTrigger = result.triggers.find((t) => t.name === 'daily-cleanup')
    const fanOutTrigger = result.triggers.find((t) => t.name === 'process')

    expect(flatTrigger?.fanOutGroup).toBeUndefined()
    expect(fanOutTrigger?.fanOutGroup).toBe('uploads')
  })
})
