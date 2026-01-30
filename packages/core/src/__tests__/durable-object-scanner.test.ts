/**
 * Tests for durable object scanner
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isDurableObjectFile,
  fileNameToObjectName,
  objectNameToBindingName,
  objectNameToClassName,
  bindingNameToObjectName,
  scanDurableObjects,
  scanDurableObjectsSync,
  OBJECTS_DIR,
} from '../durable-object-scanner.js'

describe('isDurableObjectFile', () => {
  it('should accept valid TypeScript files', () => {
    expect(isDurableObjectFile('counter.ts')).toBe(true)
    expect(isDurableObjectFile('chat-room.ts')).toBe(true)
    expect(isDurableObjectFile('rate-limiter.tsx')).toBe(true)
  })

  it('should accept valid JavaScript files', () => {
    expect(isDurableObjectFile('counter.js')).toBe(true)
    expect(isDurableObjectFile('counter.jsx')).toBe(true)
  })

  it('should reject test files', () => {
    expect(isDurableObjectFile('counter.test.ts')).toBe(false)
    expect(isDurableObjectFile('counter.spec.ts')).toBe(false)
  })

  it('should reject type definition files', () => {
    expect(isDurableObjectFile('counter.d.ts')).toBe(false)
  })

  it('should reject unsupported extensions', () => {
    expect(isDurableObjectFile('counter.json')).toBe(false)
    expect(isDurableObjectFile('counter.md')).toBe(false)
    expect(isDurableObjectFile('counter.css')).toBe(false)
  })
})

describe('fileNameToObjectName', () => {
  it('should convert kebab-case to camelCase', () => {
    expect(fileNameToObjectName('counter')).toBe('counter')
    expect(fileNameToObjectName('chat-room')).toBe('chatRoom')
    expect(fileNameToObjectName('rate-limiter')).toBe('rateLimiter')
    expect(fileNameToObjectName('my-durable-object')).toBe('myDurableObject')
  })

  it('should handle single word names', () => {
    expect(fileNameToObjectName('counter')).toBe('counter')
    expect(fileNameToObjectName('user')).toBe('user')
  })
})

describe('objectNameToBindingName', () => {
  it('should convert camelCase to SCREAMING_SNAKE_CASE', () => {
    expect(objectNameToBindingName('counter')).toBe('COUNTER')
    expect(objectNameToBindingName('chatRoom')).toBe('CHAT_ROOM')
    expect(objectNameToBindingName('rateLimiter')).toBe('RATE_LIMITER')
    expect(objectNameToBindingName('myDurableObject')).toBe('MY_DURABLE_OBJECT')
  })
})

describe('objectNameToClassName', () => {
  it('should convert camelCase to PascalCase', () => {
    expect(objectNameToClassName('counter')).toBe('Counter')
    expect(objectNameToClassName('chatRoom')).toBe('ChatRoom')
    expect(objectNameToClassName('rateLimiter')).toBe('RateLimiter')
  })
})

describe('bindingNameToObjectName', () => {
  it('should convert SCREAMING_SNAKE_CASE to camelCase', () => {
    expect(bindingNameToObjectName('COUNTER')).toBe('counter')
    expect(bindingNameToObjectName('CHAT_ROOM')).toBe('chatRoom')
    expect(bindingNameToObjectName('RATE_LIMITER')).toBe('rateLimiter')
  })
})

describe('OBJECTS_DIR', () => {
  it('should be "objects"', () => {
    expect(OBJECTS_DIR).toBe('objects')
  })
})

describe('scanDurableObjects', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-test-'))
    const objectsDir = path.join(tempDir, 'objects')
    fs.mkdirSync(objectsDir)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should find durable object files', async () => {
    const objectsDir = path.join(tempDir, 'objects')
    fs.writeFileSync(path.join(objectsDir, 'counter.ts'), '')
    fs.writeFileSync(path.join(objectsDir, 'chat-room.ts'), '')

    const result = await scanDurableObjects(tempDir, {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    expect(result.durableObjects).toHaveLength(2)
    expect(result.durableObjects.map((o) => o.name)).toContain('counter')
    expect(result.durableObjects.map((o) => o.name)).toContain('chat-room')
  })

  it('should ignore test files', async () => {
    const objectsDir = path.join(tempDir, 'objects')
    fs.writeFileSync(path.join(objectsDir, 'counter.ts'), '')
    fs.writeFileSync(path.join(objectsDir, 'counter.test.ts'), '')
    fs.writeFileSync(path.join(objectsDir, 'counter.spec.ts'), '')

    const result = await scanDurableObjects(tempDir, {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    expect(result.durableObjects).toHaveLength(1)
    expect(result.durableObjects[0].name).toBe('counter')
  })

  it('should ignore index files', async () => {
    const objectsDir = path.join(tempDir, 'objects')
    fs.writeFileSync(path.join(objectsDir, 'counter.ts'), '')
    fs.writeFileSync(path.join(objectsDir, 'index.ts'), '')

    const result = await scanDurableObjects(tempDir, {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    expect(result.durableObjects).toHaveLength(1)
    expect(result.durableObjects[0].name).toBe('counter')
  })

  it('should return empty array if no objects directory', async () => {
    fs.rmSync(path.join(tempDir, 'objects'), { recursive: true })

    const result = await scanDurableObjects(tempDir, {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    expect(result.durableObjects).toHaveLength(0)
  })

  it('should set correct extension', async () => {
    const objectsDir = path.join(tempDir, 'objects')
    fs.writeFileSync(path.join(objectsDir, 'counter.ts'), '')
    fs.writeFileSync(path.join(objectsDir, 'chat.tsx'), '')

    const result = await scanDurableObjects(tempDir, {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    const counter = result.durableObjects.find((o) => o.name === 'counter')
    const chat = result.durableObjects.find((o) => o.name === 'chat')

    expect(counter?.extension).toBe('.ts')
    expect(chat?.extension).toBe('.tsx')
  })
})

describe('scanDurableObjectsSync', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-test-'))
    const objectsDir = path.join(tempDir, 'objects')
    fs.mkdirSync(objectsDir)
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should find durable object files synchronously', () => {
    const objectsDir = path.join(tempDir, 'objects')
    fs.writeFileSync(path.join(objectsDir, 'counter.ts'), '')
    fs.writeFileSync(path.join(objectsDir, 'chat-room.ts'), '')

    const result = scanDurableObjectsSync(tempDir, {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    })

    expect(result.durableObjects).toHaveLength(2)
  })
})
