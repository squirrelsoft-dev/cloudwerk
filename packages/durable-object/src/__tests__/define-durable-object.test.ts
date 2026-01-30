/**
 * Tests for defineDurableObject factory function
 */

import { describe, it, expect } from 'vitest'
import {
  defineDurableObject,
  isDurableObjectDefinition,
  getMethodNames,
  hasHandlers,
  hasWebSocketSupport,
} from '../define-durable-object.js'
import {
  DurableObjectConfigError,
  DurableObjectNoHandlerError,
} from '../errors.js'

describe('defineDurableObject', () => {
  describe('basic creation', () => {
    it('should create a durable object definition with methods', () => {
      const definition = defineDurableObject({
        methods: {
          async increment() {
            return 1
          },
        },
      })

      expect(definition.__brand).toBe('cloudwerk-durable-object')
      expect(definition.sqlite).toBe(false)
      expect(definition.name).toBeUndefined()
    })

    it('should create a durable object definition with fetch handler', () => {
      const definition = defineDurableObject({
        async fetch() {
          return new Response('hello')
        },
      })

      expect(definition.__brand).toBe('cloudwerk-durable-object')
      expect(definition.config.fetch).toBeDefined()
    })

    it('should create a durable object definition with alarm handler', () => {
      const definition = defineDurableObject({
        async alarm() {
          // cleanup
        },
      })

      expect(definition.__brand).toBe('cloudwerk-durable-object')
      expect(definition.config.alarm).toBeDefined()
    })

    it('should create a durable object definition with WebSocket handlers', () => {
      const definition = defineDurableObject({
        async webSocketMessage() {
          // handle message
        },
      })

      expect(definition.__brand).toBe('cloudwerk-durable-object')
      expect(definition.config.webSocketMessage).toBeDefined()
    })

    it('should set sqlite flag when specified', () => {
      const definition = defineDurableObject({
        sqlite: true,
        methods: {
          async getValue() {
            return 1
          },
        },
      })

      expect(definition.sqlite).toBe(true)
    })

    it('should set name when specified', () => {
      const definition = defineDurableObject({
        name: 'my-counter',
        methods: {
          async getValue() {
            return 1
          },
        },
      })

      expect(definition.name).toBe('my-counter')
    })
  })

  describe('validation', () => {
    it('should throw if no handlers are defined', () => {
      expect(() => {
        defineDurableObject({})
      }).toThrow(DurableObjectNoHandlerError)
    })

    it('should throw if empty methods object', () => {
      expect(() => {
        defineDurableObject({
          methods: {},
        })
      }).toThrow(DurableObjectNoHandlerError)
    })

    it('should throw if name is empty string', () => {
      expect(() => {
        defineDurableObject({
          name: '',
          methods: { async foo() {} },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if name has invalid format', () => {
      expect(() => {
        defineDurableObject({
          name: 'MyCounter',
          methods: { async foo() {} },
        })
      }).toThrow(DurableObjectConfigError)

      expect(() => {
        defineDurableObject({
          name: '123-counter',
          methods: { async foo() {} },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if reserved method name is used', () => {
      expect(() => {
        defineDurableObject({
          methods: {
            async fetch() {},
          },
        })
      }).toThrow(DurableObjectConfigError)

      expect(() => {
        defineDurableObject({
          methods: {
            async alarm() {},
          },
        })
      }).toThrow(DurableObjectConfigError)

      expect(() => {
        defineDurableObject({
          methods: {
            async init() {},
          },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if method name is not a valid identifier', () => {
      expect(() => {
        defineDurableObject({
          methods: {
            'my-method': async () => {},
          },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if method is not a function', () => {
      expect(() => {
        defineDurableObject({
          methods: {
            value: 42 as unknown as () => void,
          },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if sqlite is not a boolean', () => {
      expect(() => {
        defineDurableObject({
          sqlite: 'true' as unknown as boolean,
          methods: { async foo() {} },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if init is not a function', () => {
      expect(() => {
        defineDurableObject({
          init: {} as unknown as () => void,
          methods: { async foo() {} },
        })
      }).toThrow(DurableObjectConfigError)
    })

    it('should throw if fetch is not a function', () => {
      expect(() => {
        defineDurableObject({
          fetch: {} as unknown as () => Response,
        })
      }).toThrow(DurableObjectConfigError)
    })
  })

  describe('valid configurations', () => {
    it('should accept valid name formats', () => {
      expect(() => {
        defineDurableObject({
          name: 'counter',
          methods: { async foo() {} },
        })
      }).not.toThrow()

      expect(() => {
        defineDurableObject({
          name: 'my-counter',
          methods: { async foo() {} },
        })
      }).not.toThrow()

      expect(() => {
        defineDurableObject({
          name: 'counter123',
          methods: { async foo() {} },
        })
      }).not.toThrow()
    })

    it('should accept valid method names', () => {
      const definition = defineDurableObject({
        methods: {
          increment: async () => {},
          getValue: async () => {},
          _privateMethod: async () => {},
          $special: async () => {},
        },
      })

      expect(Object.keys(definition.config.methods!)).toHaveLength(4)
    })
  })
})

describe('isDurableObjectDefinition', () => {
  it('should return true for valid definitions', () => {
    const definition = defineDurableObject({
      methods: { async foo() {} },
    })
    expect(isDurableObjectDefinition(definition)).toBe(true)
  })

  it('should return false for non-definitions', () => {
    expect(isDurableObjectDefinition(null)).toBe(false)
    expect(isDurableObjectDefinition(undefined)).toBe(false)
    expect(isDurableObjectDefinition({})).toBe(false)
    expect(isDurableObjectDefinition({ __brand: 'other' })).toBe(false)
    expect(isDurableObjectDefinition('string')).toBe(false)
  })
})

describe('getMethodNames', () => {
  it('should return method names from definition', () => {
    const definition = defineDurableObject({
      methods: {
        increment: async () => {},
        decrement: async () => {},
        getValue: async () => {},
      },
    })

    const names = getMethodNames(definition)
    expect(names).toEqual(['increment', 'decrement', 'getValue'])
  })

  it('should return empty array if no methods', () => {
    const definition = defineDurableObject({
      async fetch() {
        return new Response()
      },
    })

    const names = getMethodNames(definition)
    expect(names).toEqual([])
  })
})

describe('hasHandlers', () => {
  it('should return true if methods are defined', () => {
    const definition = defineDurableObject({
      methods: { async foo() {} },
    })
    expect(hasHandlers(definition)).toBe(true)
  })

  it('should return true if fetch is defined', () => {
    const definition = defineDurableObject({
      async fetch() {
        return new Response()
      },
    })
    expect(hasHandlers(definition)).toBe(true)
  })

  it('should return true if alarm is defined', () => {
    const definition = defineDurableObject({
      async alarm() {},
    })
    expect(hasHandlers(definition)).toBe(true)
  })

  it('should return true if webSocketMessage is defined', () => {
    const definition = defineDurableObject({
      async webSocketMessage() {},
    })
    expect(hasHandlers(definition)).toBe(true)
  })
})

describe('hasWebSocketSupport', () => {
  it('should return true if webSocketMessage is defined', () => {
    const definition = defineDurableObject({
      async webSocketMessage() {},
    })
    expect(hasWebSocketSupport(definition)).toBe(true)
  })

  it('should return true if webSocketClose is defined', () => {
    const definition = defineDurableObject({
      async webSocketClose() {},
      async webSocketMessage() {}, // Need at least one handler
    })
    expect(hasWebSocketSupport(definition)).toBe(true)
  })

  it('should return false if no WebSocket handlers', () => {
    const definition = defineDurableObject({
      async fetch() {
        return new Response()
      },
    })
    expect(hasWebSocketSupport(definition)).toBe(false)
  })
})
