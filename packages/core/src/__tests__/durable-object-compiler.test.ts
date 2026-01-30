/**
 * Tests for durable object compiler
 */

import { describe, it, expect } from 'vitest'
import {
  compileDurableObject,
  buildDurableObjectManifest,
  updateDurableObjectEntryFromDefinition,
  formatDurableObjectErrors,
  formatDurableObjectWarnings,
  hasDurableObjectErrors,
  hasDurableObjectWarnings,
} from '../durable-object-compiler.js'
import type { ScannedDurableObject, DurableObjectScanResult } from '../durable-object-scanner.js'

describe('compileDurableObject', () => {
  it('should create entry from scanned object', () => {
    const scanned: ScannedDurableObject = {
      relativePath: 'counter.ts',
      absolutePath: '/app/objects/counter.ts',
      name: 'counter',
      extension: '.ts',
    }

    const entry = compileDurableObject(scanned)

    expect(entry.name).toBe('counter')
    expect(entry.bindingName).toBe('COUNTER')
    expect(entry.className).toBe('Counter')
    expect(entry.filePath).toBe('counter.ts')
    expect(entry.absolutePath).toBe('/app/objects/counter.ts')
    expect(entry.sqlite).toBe(false)
    expect(entry.hasFetch).toBe(false)
    expect(entry.hasWebSocket).toBe(false)
    expect(entry.hasAlarm).toBe(false)
    expect(entry.methodNames).toEqual([])
  })

  it('should convert kebab-case names', () => {
    const scanned: ScannedDurableObject = {
      relativePath: 'chat-room.ts',
      absolutePath: '/app/objects/chat-room.ts',
      name: 'chat-room',
      extension: '.ts',
    }

    const entry = compileDurableObject(scanned)

    expect(entry.name).toBe('chatRoom')
    expect(entry.bindingName).toBe('CHAT_ROOM')
    expect(entry.className).toBe('ChatRoom')
  })

  it('should set generated path', () => {
    const scanned: ScannedDurableObject = {
      relativePath: 'counter.ts',
      absolutePath: '/app/objects/counter.ts',
      name: 'counter',
      extension: '.ts',
    }

    const entry = compileDurableObject(scanned, '.cloudwerk/generated/objects')

    expect(entry.generatedPath).toBe('.cloudwerk/generated/objects/Counter.ts')
  })
})

describe('buildDurableObjectManifest', () => {
  it('should build manifest from scan result', () => {
    const scanResult: DurableObjectScanResult = {
      durableObjects: [
        {
          relativePath: 'counter.ts',
          absolutePath: '/app/objects/counter.ts',
          name: 'counter',
          extension: '.ts',
        },
        {
          relativePath: 'chat-room.ts',
          absolutePath: '/app/objects/chat-room.ts',
          name: 'chat-room',
          extension: '.ts',
        },
      ],
    }

    const manifest = buildDurableObjectManifest(scanResult, '/app')

    expect(manifest.durableObjects).toHaveLength(2)
    expect(manifest.errors).toHaveLength(0)
    expect(manifest.rootDir).toBe('/app')
    expect(manifest.generatedAt).toBeInstanceOf(Date)
  })

  it('should detect duplicate names', () => {
    const scanResult: DurableObjectScanResult = {
      durableObjects: [
        {
          relativePath: 'counter.ts',
          absolutePath: '/app/objects/counter.ts',
          name: 'counter',
          extension: '.ts',
        },
        {
          relativePath: 'counter.tsx',
          absolutePath: '/app/objects/counter.tsx',
          name: 'counter',
          extension: '.tsx',
        },
      ],
    }

    const manifest = buildDurableObjectManifest(scanResult, '/app')

    expect(manifest.durableObjects).toHaveLength(1)
    expect(manifest.errors).toHaveLength(1)
    expect(manifest.errors[0].code).toBe('DUPLICATE_NAME')
  })

  it('should validate name format', () => {
    const scanResult: DurableObjectScanResult = {
      durableObjects: [
        {
          relativePath: '123-counter.ts',
          absolutePath: '/app/objects/123-counter.ts',
          name: '123-counter', // Invalid - starts with number
          extension: '.ts',
        },
      ],
    }

    const manifest = buildDurableObjectManifest(scanResult, '/app')

    expect(manifest.durableObjects).toHaveLength(0)
    expect(manifest.errors).toHaveLength(1)
    expect(manifest.errors[0].code).toBe('INVALID_NAME')
  })
})

describe('updateDurableObjectEntryFromDefinition', () => {
  it('should update entry with definition values', () => {
    const entry = {
      name: 'counter',
      bindingName: 'COUNTER',
      className: 'Counter',
      filePath: 'counter.ts',
      absolutePath: '/app/objects/counter.ts',
      generatedPath: '.cloudwerk/generated/objects/Counter.ts',
      sqlite: false,
      hasFetch: false,
      hasWebSocket: false,
      hasAlarm: false,
      methodNames: [],
    }

    const definition = {
      name: 'myCounter',
      sqlite: true,
      config: {
        fetch: () => new Response(),
        alarm: () => {},
        methods: {
          increment: () => {},
          decrement: () => {},
        },
      },
    }

    const updated = updateDurableObjectEntryFromDefinition(entry, definition)

    expect(updated.name).toBe('myCounter')
    expect(updated.sqlite).toBe(true)
    expect(updated.hasFetch).toBe(true)
    expect(updated.hasAlarm).toBe(true)
    expect(updated.methodNames).toEqual(['increment', 'decrement'])
  })

  it('should detect WebSocket handlers', () => {
    const entry = {
      name: 'chat',
      bindingName: 'CHAT',
      className: 'Chat',
      filePath: 'chat.ts',
      absolutePath: '/app/objects/chat.ts',
      generatedPath: '.cloudwerk/generated/objects/Chat.ts',
      sqlite: false,
      hasFetch: false,
      hasWebSocket: false,
      hasAlarm: false,
      methodNames: [],
    }

    const definition = {
      config: {
        webSocketMessage: () => {},
        webSocketClose: () => {},
      },
    }

    const updated = updateDurableObjectEntryFromDefinition(entry, definition)

    expect(updated.hasWebSocket).toBe(true)
  })

  it('should keep original values if not in definition', () => {
    const entry = {
      name: 'counter',
      bindingName: 'COUNTER',
      className: 'Counter',
      filePath: 'counter.ts',
      absolutePath: '/app/objects/counter.ts',
      generatedPath: '.cloudwerk/generated/objects/Counter.ts',
      sqlite: false,
      hasFetch: false,
      hasWebSocket: false,
      hasAlarm: false,
      methodNames: [],
    }

    const definition = {
      config: {
        methods: {
          getValue: () => {},
        },
      },
    }

    const updated = updateDurableObjectEntryFromDefinition(entry, definition)

    expect(updated.name).toBe('counter')
    expect(updated.sqlite).toBe(false)
    expect(updated.methodNames).toEqual(['getValue'])
  })
})

describe('formatDurableObjectErrors', () => {
  it('should format errors', () => {
    const errors = [
      { file: 'counter.ts', message: 'Duplicate name', code: 'DUPLICATE_NAME' as const },
      { file: 'invalid.ts', message: 'Invalid name', code: 'INVALID_NAME' as const },
    ]

    const formatted = formatDurableObjectErrors(errors)

    expect(formatted).toContain('Durable object validation errors')
    expect(formatted).toContain('counter.ts')
    expect(formatted).toContain('Duplicate name')
    expect(formatted).toContain('invalid.ts')
    expect(formatted).toContain('Invalid name')
  })

  it('should return empty string for no errors', () => {
    expect(formatDurableObjectErrors([])).toBe('')
  })
})

describe('formatDurableObjectWarnings', () => {
  it('should format warnings', () => {
    const warnings = [
      { file: 'counter.ts', message: 'No init function', code: 'NO_INIT' as const },
    ]

    const formatted = formatDurableObjectWarnings(warnings)

    expect(formatted).toContain('Durable object validation warnings')
    expect(formatted).toContain('counter.ts')
    expect(formatted).toContain('No init function')
  })

  it('should return empty string for no warnings', () => {
    expect(formatDurableObjectWarnings([])).toBe('')
  })
})

describe('hasDurableObjectErrors', () => {
  it('should return true if manifest has errors', () => {
    const manifest = {
      durableObjects: [],
      errors: [{ file: 'test.ts', message: 'Error', code: 'INVALID_NAME' as const }],
      warnings: [],
      generatedAt: new Date(),
      rootDir: '/app',
    }

    expect(hasDurableObjectErrors(manifest)).toBe(true)
  })

  it('should return false if manifest has no errors', () => {
    const manifest = {
      durableObjects: [],
      errors: [],
      warnings: [],
      generatedAt: new Date(),
      rootDir: '/app',
    }

    expect(hasDurableObjectErrors(manifest)).toBe(false)
  })
})

describe('hasDurableObjectWarnings', () => {
  it('should return true if manifest has warnings', () => {
    const manifest = {
      durableObjects: [],
      errors: [],
      warnings: [{ file: 'test.ts', message: 'Warning', code: 'NO_INIT' as const }],
      generatedAt: new Date(),
      rootDir: '/app',
    }

    expect(hasDurableObjectWarnings(manifest)).toBe(true)
  })

  it('should return false if manifest has no warnings', () => {
    const manifest = {
      durableObjects: [],
      errors: [],
      warnings: [],
      generatedAt: new Date(),
      rootDir: '/app',
    }

    expect(hasDurableObjectWarnings(manifest)).toBe(false)
  })
})
