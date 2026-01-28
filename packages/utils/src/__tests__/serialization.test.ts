/**
 * @cloudwerk/utils - Serialization Tests
 *
 * Tests for props serialization and deserialization utilities.
 */

import { describe, it, expect } from 'vitest'
import { serializeProps, deserializeProps } from '../serialization.js'

// ============================================================================
// serializeProps Tests
// ============================================================================

describe('serializeProps', () => {
  it('should serialize simple props', () => {
    const props = { count: 0, label: 'Click me' }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0,"label":"Click me"}')
  })

  it('should filter out children', () => {
    const props = { count: 0, children: '<div>Child</div>' }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
    expect(json).not.toContain('children')
  })

  it('should filter out functions', () => {
    const props = { count: 0, onClick: () => {} }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
    expect(json).not.toContain('onClick')
  })

  it('should filter out symbols', () => {
    const props = { count: 0, [Symbol('test')]: 'value' }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
  })

  it('should filter out undefined values', () => {
    const props = { count: 0, optional: undefined }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0}')
  })

  it('should keep null values', () => {
    const props = { count: 0, nullable: null }
    const json = serializeProps(props)
    expect(json).toBe('{"count":0,"nullable":null}')
  })

  it('should serialize nested objects', () => {
    const props = { user: { name: 'John', age: 30 } }
    const json = serializeProps(props)
    expect(json).toBe('{"user":{"name":"John","age":30}}')
  })

  it('should serialize arrays', () => {
    const props = { items: [1, 2, 3] }
    const json = serializeProps(props)
    expect(json).toBe('{"items":[1,2,3]}')
  })

  it('should handle empty props', () => {
    const props = {}
    const json = serializeProps(props)
    expect(json).toBe('{}')
  })

  it('should serialize boolean values', () => {
    const props = { active: true, disabled: false }
    const json = serializeProps(props)
    expect(json).toBe('{"active":true,"disabled":false}')
  })
})

// ============================================================================
// deserializeProps Tests
// ============================================================================

describe('deserializeProps', () => {
  it('should deserialize props', () => {
    const json = '{"count":0,"label":"Click me"}'
    const props = deserializeProps(json)
    expect(props).toEqual({ count: 0, label: 'Click me' })
  })

  it('should deserialize nested objects', () => {
    const json = '{"user":{"name":"John","age":30}}'
    const props = deserializeProps(json)
    expect(props).toEqual({ user: { name: 'John', age: 30 } })
  })

  it('should deserialize arrays', () => {
    const json = '{"items":[1,2,3]}'
    const props = deserializeProps(json)
    expect(props).toEqual({ items: [1, 2, 3] })
  })

  it('should deserialize null values', () => {
    const json = '{"value":null}'
    const props = deserializeProps(json)
    expect(props).toEqual({ value: null })
  })

  it('should throw on invalid JSON', () => {
    expect(() => deserializeProps('invalid')).toThrow('Failed to deserialize props')
  })

  it('should throw on incomplete JSON', () => {
    expect(() => deserializeProps('{"count":')).toThrow('Failed to deserialize props')
  })
})
