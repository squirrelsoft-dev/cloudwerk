import { describe, it, expect } from 'vitest'
import {
  defineQueue,
  isQueueDefinition,
  parseDuration,
} from '../define-queue.js'
import { QueueConfigError, QueueNoHandlerError } from '../errors.js'

describe('defineQueue', () => {
  describe('basic functionality', () => {
    it('should create a queue definition with process handler', () => {
      const definition = defineQueue({
        async process(message) {
          // Process message
          message.ack()
        },
      })

      expect(definition.__brand).toBe('cloudwerk-queue')
      expect(definition.process).toBeDefined()
      expect(definition.processBatch).toBeUndefined()
    })

    it('should create a queue definition with processBatch handler', () => {
      const definition = defineQueue({
        async processBatch(messages) {
          // Process messages
          messages.forEach((m) => m.ack())
        },
      })

      expect(definition.__brand).toBe('cloudwerk-queue')
      expect(definition.process).toBeUndefined()
      expect(definition.processBatch).toBeDefined()
    })

    it('should allow both process and processBatch', () => {
      const definition = defineQueue({
        async process(message) {
          message.ack()
        },
        async processBatch(messages) {
          messages.forEach((m) => m.ack())
        },
      })

      expect(definition.process).toBeDefined()
      expect(definition.processBatch).toBeDefined()
    })

    it('should accept onError handler', () => {
      const definition = defineQueue({
        async process(message) {
          message.ack()
        },
        async onError(error, message) {
          console.error(error)
        },
      })

      expect(definition.onError).toBeDefined()
    })

    it('should accept custom name', () => {
      const definition = defineQueue({
        name: 'my-queue',
        async process(message) {
          message.ack()
        },
      })

      expect(definition.name).toBe('my-queue')
    })
  })

  describe('configuration', () => {
    it('should apply default configuration', () => {
      const definition = defineQueue({
        async process(message) {
          message.ack()
        },
      })

      expect(definition.config.batchSize).toBe(10)
      expect(definition.config.maxRetries).toBe(3)
      expect(definition.config.retryDelay).toBe('1m')
      expect(definition.config.batchTimeout).toBe('5s')
    })

    it('should merge custom configuration with defaults', () => {
      const definition = defineQueue({
        config: {
          batchSize: 20,
          maxRetries: 5,
        },
        async process(message) {
          message.ack()
        },
      })

      expect(definition.config.batchSize).toBe(20)
      expect(definition.config.maxRetries).toBe(5)
      expect(definition.config.retryDelay).toBe('1m') // Default
      expect(definition.config.batchTimeout).toBe('5s') // Default
    })

    it('should accept deadLetterQueue configuration', () => {
      const definition = defineQueue({
        config: {
          deadLetterQueue: 'my-dlq',
        },
        async process(message) {
          message.ack()
        },
      })

      expect(definition.config.deadLetterQueue).toBe('my-dlq')
    })
  })

  describe('validation', () => {
    it('should throw QueueNoHandlerError if no handler is defined', () => {
      expect(() => {
        defineQueue({} as Parameters<typeof defineQueue>[0])
      }).toThrow(QueueNoHandlerError)
    })

    it('should throw QueueConfigError for invalid batchSize', () => {
      expect(() => {
        defineQueue({
          config: { batchSize: 0 },
          async process(message) {
            message.ack()
          },
        })
      }).toThrow(QueueConfigError)

      expect(() => {
        defineQueue({
          config: { batchSize: 101 },
          async process(message) {
            message.ack()
          },
        })
      }).toThrow(QueueConfigError)
    })

    it('should throw QueueConfigError for invalid maxRetries', () => {
      expect(() => {
        defineQueue({
          config: { maxRetries: -1 },
          async process(message) {
            message.ack()
          },
        })
      }).toThrow(QueueConfigError)
    })

    it('should throw QueueConfigError for invalid name format', () => {
      expect(() => {
        defineQueue({
          name: 'MyQueue', // Should be lowercase
          async process(message) {
            message.ack()
          },
        })
      }).toThrow(QueueConfigError)

      expect(() => {
        defineQueue({
          name: '123-queue', // Should start with letter
          async process(message) {
            message.ack()
          },
        })
      }).toThrow(QueueConfigError)
    })

    it('should throw QueueConfigError for invalid retryDelay format', () => {
      expect(() => {
        defineQueue({
          config: { retryDelay: '5x' }, // Invalid unit
          async process(message) {
            message.ack()
          },
        })
      }).toThrow(QueueConfigError)
    })
  })

  describe('type safety', () => {
    it('should preserve message type through definition', () => {
      interface EmailMessage {
        to: string
        subject: string
      }

      const definition = defineQueue<EmailMessage>({
        async process(message) {
          // TypeScript should know message.body is EmailMessage
          const { to, subject } = message.body
          expect(typeof to).toBe('string')
          expect(typeof subject).toBe('string')
          message.ack()
        },
      })

      expect(definition).toBeDefined()
    })
  })
})

describe('isQueueDefinition', () => {
  it('should return true for queue definitions', () => {
    const definition = defineQueue({
      async process(message) {
        message.ack()
      },
    })

    expect(isQueueDefinition(definition)).toBe(true)
  })

  it('should return false for non-queue objects', () => {
    expect(isQueueDefinition(null)).toBe(false)
    expect(isQueueDefinition(undefined)).toBe(false)
    expect(isQueueDefinition({})).toBe(false)
    expect(isQueueDefinition({ __brand: 'other' })).toBe(false)
    expect(isQueueDefinition('string')).toBe(false)
    expect(isQueueDefinition(123)).toBe(false)
  })
})

describe('parseDuration', () => {
  it('should parse seconds', () => {
    expect(parseDuration('30s')).toBe(30)
    expect(parseDuration('1s')).toBe(1)
    expect(parseDuration('0s')).toBe(0)
  })

  it('should parse minutes', () => {
    expect(parseDuration('1m')).toBe(60)
    expect(parseDuration('5m')).toBe(300)
    expect(parseDuration('10m')).toBe(600)
  })

  it('should parse hours', () => {
    expect(parseDuration('1h')).toBe(3600)
    expect(parseDuration('2h')).toBe(7200)
  })

  it('should pass through numbers', () => {
    expect(parseDuration(30)).toBe(30)
    expect(parseDuration(0)).toBe(0)
    expect(parseDuration(3600)).toBe(3600)
  })

  it('should throw for invalid format', () => {
    expect(() => parseDuration('30')).toThrow(QueueConfigError)
    expect(() => parseDuration('5x')).toThrow(QueueConfigError)
    expect(() => parseDuration('abc')).toThrow(QueueConfigError)
  })
})
