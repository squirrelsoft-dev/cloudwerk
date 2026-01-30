import { describe, it, expect } from 'vitest'
import {
  defineService,
  isServiceDefinition,
} from '../define-service.js'
import {
  ServiceConfigError,
  ServiceNoMethodsError,
  ServiceInvalidMethodError,
} from '../errors.js'

describe('defineService', () => {
  describe('basic functionality', () => {
    it('should create a service definition with methods', () => {
      const definition = defineService({
        methods: {
          async send({ to }: { to: string }) {
            return { success: true, to }
          },
        },
      })

      expect(definition.__brand).toBe('cloudwerk-service')
      expect(definition.methods).toBeDefined()
      expect(definition.methods.send).toBeDefined()
    })

    it('should create a service definition with multiple methods', () => {
      const definition = defineService({
        methods: {
          async send({ to }: { to: string }) {
            return { success: true }
          },
          async sendBatch(emails: Array<{ to: string }>) {
            return { sent: emails.length }
          },
          async getStatus() {
            return { status: 'ready' }
          },
        },
      })

      expect(Object.keys(definition.methods)).toHaveLength(3)
      expect(definition.methods.send).toBeDefined()
      expect(definition.methods.sendBatch).toBeDefined()
      expect(definition.methods.getStatus).toBeDefined()
    })

    it('should accept custom name', () => {
      const definition = defineService({
        name: 'email',
        methods: {
          async send() {
            return { success: true }
          },
        },
      })

      expect(definition.name).toBe('email')
    })
  })

  describe('hooks', () => {
    it('should accept lifecycle hooks', () => {
      const definition = defineService({
        methods: {
          async send() {
            return { success: true }
          },
        },
        hooks: {
          onInit: async () => {},
          onBefore: async (method, args) => {},
          onAfter: async (method, result) => {},
          onError: async (method, error) => {},
        },
      })

      expect(definition.hooks).toBeDefined()
      expect(definition.hooks!.onInit).toBeDefined()
      expect(definition.hooks!.onBefore).toBeDefined()
      expect(definition.hooks!.onAfter).toBeDefined()
      expect(definition.hooks!.onError).toBeDefined()
    })

    it('should allow partial hooks', () => {
      const definition = defineService({
        methods: {
          async send() {
            return { success: true }
          },
        },
        hooks: {
          onError: async (method, error) => {
            console.error(`${method} failed:`, error)
          },
        },
      })

      expect(definition.hooks).toBeDefined()
      expect(definition.hooks!.onError).toBeDefined()
      expect(definition.hooks!.onInit).toBeUndefined()
      expect(definition.hooks!.onBefore).toBeUndefined()
      expect(definition.hooks!.onAfter).toBeUndefined()
    })
  })

  describe('configuration', () => {
    it('should accept extraction configuration', () => {
      const definition = defineService({
        methods: {
          async send() {
            return { success: true }
          },
        },
        config: {
          extraction: {
            workerName: 'email-service',
            bindings: ['RESEND_API_KEY', 'DB'],
          },
        },
      })

      expect(definition.config).toBeDefined()
      expect(definition.config.extraction).toBeDefined()
      expect(definition.config.extraction!.workerName).toBe('email-service')
      expect(definition.config.extraction!.bindings).toEqual(['RESEND_API_KEY', 'DB'])
    })

    it('should have default empty config', () => {
      const definition = defineService({
        methods: {
          async send() {
            return { success: true }
          },
        },
      })

      expect(definition.config).toBeDefined()
      expect(definition.config.extraction).toBeUndefined()
    })
  })

  describe('validation', () => {
    it('should throw ServiceNoMethodsError if no methods defined', () => {
      expect(() => {
        defineService({
          methods: {},
        })
      }).toThrow(ServiceNoMethodsError)
    })

    it('should throw ServiceNoMethodsError if methods is not an object', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        defineService({})
      }).toThrow(ServiceNoMethodsError)
    })

    it('should throw ServiceInvalidMethodError for non-function method', () => {
      expect(() => {
        defineService({
          methods: {
            // @ts-expect-error Testing invalid input
            send: 'not a function',
          },
        })
      }).toThrow(ServiceInvalidMethodError)
    })

    it('should throw ServiceInvalidMethodError for invalid method name', () => {
      expect(() => {
        defineService({
          methods: {
            // @ts-expect-error Testing invalid input
            '123invalid': async () => {},
          },
        })
      }).toThrow(ServiceInvalidMethodError)
    })

    it('should throw ServiceInvalidMethodError for reserved method names', () => {
      expect(() => {
        defineService({
          methods: {
            // @ts-expect-error Testing invalid input
            constructor: async () => {},
          },
        })
      }).toThrow(ServiceInvalidMethodError)

      expect(() => {
        defineService({
          methods: {
            // @ts-expect-error Testing invalid input
            fetch: async () => {},
          },
        })
      }).toThrow(ServiceInvalidMethodError)
    })

    it('should throw ServiceConfigError for invalid name format', () => {
      expect(() => {
        defineService({
          name: 'MyService', // Should be lowercase/camelCase
          methods: {
            async send() {
              return { success: true }
            },
          },
        })
      }).toThrow(ServiceConfigError)

      expect(() => {
        defineService({
          name: '123service', // Should start with letter
          methods: {
            async send() {
              return { success: true }
            },
          },
        })
      }).toThrow(ServiceConfigError)
    })

    it('should throw ServiceConfigError for invalid workerName format', () => {
      expect(() => {
        defineService({
          methods: {
            async send() {
              return { success: true }
            },
          },
          config: {
            extraction: {
              workerName: 'MyWorker', // Should be lowercase with hyphens
            },
          },
        })
      }).toThrow(ServiceConfigError)
    })

    it('should throw ServiceConfigError for invalid bindings', () => {
      expect(() => {
        defineService({
          methods: {
            async send() {
              return { success: true }
            },
          },
          config: {
            extraction: {
              // @ts-expect-error Testing invalid input
              bindings: 'not an array',
            },
          },
        })
      }).toThrow(ServiceConfigError)

      expect(() => {
        defineService({
          methods: {
            async send() {
              return { success: true }
            },
          },
          config: {
            extraction: {
              bindings: ['invalid-binding-name'], // Should be SCREAMING_SNAKE_CASE or camelCase
            },
          },
        })
      }).toThrow(ServiceConfigError)
    })

    it('should throw ServiceConfigError for invalid hooks', () => {
      expect(() => {
        defineService({
          methods: {
            async send() {
              return { success: true }
            },
          },
          hooks: {
            // @ts-expect-error Testing invalid input
            onInit: 'not a function',
          },
        })
      }).toThrow(ServiceConfigError)
    })
  })

  describe('valid names and formats', () => {
    it('should accept valid service names', () => {
      expect(() => {
        defineService({
          name: 'email',
          methods: { async send() {} },
        })
      }).not.toThrow()

      expect(() => {
        defineService({
          name: 'userManagement',
          methods: { async send() {} },
        })
      }).not.toThrow()

      expect(() => {
        defineService({
          name: 'my-service',
          methods: { async send() {} },
        })
      }).not.toThrow()
    })

    it('should accept valid worker names', () => {
      expect(() => {
        defineService({
          methods: { async send() {} },
          config: {
            extraction: {
              workerName: 'email-service',
            },
          },
        })
      }).not.toThrow()

      expect(() => {
        defineService({
          methods: { async send() {} },
          config: {
            extraction: {
              workerName: 'my-app-email',
            },
          },
        })
      }).not.toThrow()
    })

    it('should accept valid binding names', () => {
      expect(() => {
        defineService({
          methods: { async send() {} },
          config: {
            extraction: {
              bindings: ['DB', 'API_KEY', 'RESEND_API_KEY'],
            },
          },
        })
      }).not.toThrow()

      expect(() => {
        defineService({
          methods: { async send() {} },
          config: {
            extraction: {
              bindings: ['myBinding', 'anotherOne'],
            },
          },
        })
      }).not.toThrow()
    })
  })
})

describe('isServiceDefinition', () => {
  it('should return true for service definitions', () => {
    const definition = defineService({
      methods: {
        async send() {
          return { success: true }
        },
      },
    })

    expect(isServiceDefinition(definition)).toBe(true)
  })

  it('should return false for non-service objects', () => {
    expect(isServiceDefinition(null)).toBe(false)
    expect(isServiceDefinition(undefined)).toBe(false)
    expect(isServiceDefinition({})).toBe(false)
    expect(isServiceDefinition({ __brand: 'other' })).toBe(false)
    expect(isServiceDefinition({ __brand: 'cloudwerk-queue' })).toBe(false)
    expect(isServiceDefinition('string')).toBe(false)
    expect(isServiceDefinition(123)).toBe(false)
  })
})
