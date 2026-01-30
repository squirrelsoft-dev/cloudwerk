/**
 * Tests for durable object error classes
 */

import { describe, it, expect } from 'vitest'
import {
  DurableObjectError,
  DurableObjectConfigError,
  DurableObjectNoHandlerError,
  DurableObjectContextError,
  DurableObjectNotFoundError,
  DurableObjectStateError,
  DurableObjectSchemaValidationError,
  DurableObjectRPCError,
  DurableObjectMethodNotFoundError,
  DurableObjectAlarmError,
  DurableObjectWebSocketError,
} from '../errors.js'

describe('DurableObjectError', () => {
  it('should create error with code and message', () => {
    const error = new DurableObjectError('TEST_CODE', 'Test message')
    expect(error.code).toBe('TEST_CODE')
    expect(error.message).toBe('Test message')
    expect(error.name).toBe('DurableObjectError')
    expect(error).toBeInstanceOf(Error)
  })

  it('should support error cause', () => {
    const cause = new Error('Original error')
    const error = new DurableObjectError('TEST', 'Wrapper', { cause })
    expect(error.cause).toBe(cause)
  })
})

describe('DurableObjectConfigError', () => {
  it('should create error with field', () => {
    const error = new DurableObjectConfigError('Invalid config', 'name')
    expect(error.code).toBe('CONFIG_ERROR')
    expect(error.field).toBe('name')
    expect(error.name).toBe('DurableObjectConfigError')
  })

  it('should work without field', () => {
    const error = new DurableObjectConfigError('Invalid config')
    expect(error.field).toBeUndefined()
  })
})

describe('DurableObjectNoHandlerError', () => {
  it('should create error with object name', () => {
    const error = new DurableObjectNoHandlerError('counter')
    expect(error.code).toBe('NO_HANDLER')
    expect(error.message).toContain('counter')
    expect(error.message).toContain('methods, fetch, alarm')
    expect(error.name).toBe('DurableObjectNoHandlerError')
  })
})

describe('DurableObjectContextError', () => {
  it('should create context error', () => {
    const error = new DurableObjectContextError()
    expect(error.code).toBe('CONTEXT_ERROR')
    expect(error.message).toContain('outside of request')
    expect(error.name).toBe('DurableObjectContextError')
  })
})

describe('DurableObjectNotFoundError', () => {
  it('should create not found error with available objects', () => {
    const error = new DurableObjectNotFoundError('counter', ['chat', 'user'])
    expect(error.code).toBe('DURABLE_OBJECT_NOT_FOUND')
    expect(error.objectName).toBe('counter')
    expect(error.availableObjects).toEqual(['chat', 'user'])
    expect(error.message).toContain('counter')
    expect(error.message).toContain('chat, user')
    expect(error.name).toBe('DurableObjectNotFoundError')
  })

  it('should handle empty available objects', () => {
    const error = new DurableObjectNotFoundError('counter', [])
    expect(error.message).toContain('No durable objects are configured')
  })
})

describe('DurableObjectStateError', () => {
  it('should create state error', () => {
    const error = new DurableObjectStateError('counter', 'State is corrupted')
    expect(error.code).toBe('STATE_ERROR')
    expect(error.objectName).toBe('counter')
    expect(error.message).toContain('counter')
    expect(error.message).toContain('State is corrupted')
    expect(error.name).toBe('DurableObjectStateError')
  })
})

describe('DurableObjectSchemaValidationError', () => {
  it('should create validation error with errors', () => {
    const validationErrors = [{ path: 'value', message: 'Required' }]
    const error = new DurableObjectSchemaValidationError('Validation failed', validationErrors)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.validationErrors).toBe(validationErrors)
    expect(error.name).toBe('DurableObjectSchemaValidationError')
  })
})

describe('DurableObjectRPCError', () => {
  it('should create RPC error', () => {
    const error = new DurableObjectRPCError('counter', 'increment', 'Method threw error')
    expect(error.code).toBe('RPC_ERROR')
    expect(error.objectName).toBe('counter')
    expect(error.methodName).toBe('increment')
    expect(error.message).toContain('counter')
    expect(error.message).toContain('increment')
    expect(error.name).toBe('DurableObjectRPCError')
  })
})

describe('DurableObjectMethodNotFoundError', () => {
  it('should create method not found error', () => {
    const error = new DurableObjectMethodNotFoundError('counter', 'reset', ['increment', 'decrement'])
    expect(error.code).toBe('METHOD_NOT_FOUND')
    expect(error.objectName).toBe('counter')
    expect(error.methodName).toBe('reset')
    expect(error.availableMethods).toEqual(['increment', 'decrement'])
    expect(error.message).toContain('reset')
    expect(error.message).toContain('increment, decrement')
    expect(error.name).toBe('DurableObjectMethodNotFoundError')
  })

  it('should handle empty available methods', () => {
    const error = new DurableObjectMethodNotFoundError('counter', 'reset', [])
    expect(error.message).toContain('No RPC methods are defined')
  })
})

describe('DurableObjectAlarmError', () => {
  it('should create alarm error', () => {
    const error = new DurableObjectAlarmError('counter', 'Alarm failed')
    expect(error.code).toBe('ALARM_ERROR')
    expect(error.objectName).toBe('counter')
    expect(error.message).toContain('counter')
    expect(error.message).toContain('Alarm failed')
    expect(error.name).toBe('DurableObjectAlarmError')
  })
})

describe('DurableObjectWebSocketError', () => {
  it('should create WebSocket error', () => {
    const error = new DurableObjectWebSocketError('chat', 'Connection failed')
    expect(error.code).toBe('WEBSOCKET_ERROR')
    expect(error.objectName).toBe('chat')
    expect(error.message).toContain('chat')
    expect(error.message).toContain('Connection failed')
    expect(error.name).toBe('DurableObjectWebSocketError')
  })
})
