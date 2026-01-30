import { describe, it, expect } from 'vitest'
import {
  createDeadLetterMessage,
  createDLQConfig,
  validateDLQConfig,
  shouldSendToDLQ,
  extractOriginalMessage,
  isDeadLetterMessage,
  defineDLQConsumer,
} from '../dlq.js'
import type { QueueMessage, DeadLetterMessage } from '../types.js'

// Helper to create a mock QueueMessage
function createMockMessage<T>(body: T, attempts: number = 1): QueueMessage<T> {
  return {
    id: 'msg-123',
    body,
    timestamp: new Date(),
    attempts,
    ack: () => {},
    retry: () => {},
    deadLetter: () => {},
  }
}

describe('createDeadLetterMessage', () => {
  it('should create a dead letter message from a failed queue message', () => {
    const originalBody = { to: 'user@example.com', subject: 'Hello' }
    const message = createMockMessage(originalBody, 3)
    const error = new Error('Failed to send email')

    const dlqMessage = createDeadLetterMessage(message, 'email', error)

    expect(dlqMessage.originalQueue).toBe('email')
    expect(dlqMessage.originalMessage).toEqual(originalBody)
    expect(dlqMessage.error).toBe('Failed to send email')
    expect(dlqMessage.attempts).toBe(3)
    expect(dlqMessage.originalMessageId).toBe('msg-123')
    expect(dlqMessage.failedAt).toBeDefined()
  })

  it('should include stack trace if available', () => {
    const message = createMockMessage({ data: 'test' })
    const error = new Error('Test error')

    const dlqMessage = createDeadLetterMessage(message, 'test-queue', error)

    expect(dlqMessage.stack).toBeDefined()
    expect(dlqMessage.stack).toContain('Test error')
  })
})

describe('createDLQConfig', () => {
  it('should create DLQ config with defaults', () => {
    const config = createDLQConfig('my-dlq')

    expect(config.queueName).toBe('my-dlq')
    expect(config.maxRetries).toBe(3)
    expect(config.beforeDLQ).toBeUndefined()
    expect(config.afterDLQ).toBeUndefined()
  })

  it('should allow custom maxRetries', () => {
    const config = createDLQConfig('my-dlq', { maxRetries: 5 })

    expect(config.maxRetries).toBe(5)
  })

  it('should allow custom callbacks', () => {
    const beforeDLQ = async () => true
    const afterDLQ = async () => {}

    const config = createDLQConfig('my-dlq', { beforeDLQ, afterDLQ })

    expect(config.beforeDLQ).toBe(beforeDLQ)
    expect(config.afterDLQ).toBe(afterDLQ)
  })
})

describe('validateDLQConfig', () => {
  it('should return no errors for valid config', () => {
    const errors = validateDLQConfig({
      queueName: 'my-dlq',
      maxRetries: 3,
    })

    expect(errors).toHaveLength(0)
  })

  it('should return error for empty queue name', () => {
    const errors = validateDLQConfig({
      queueName: '',
    })

    expect(errors).toContain('DLQ queue name is required')
  })

  it('should return error for invalid queue name format', () => {
    const errors = validateDLQConfig({
      queueName: 'MyDLQ',
    })

    expect(errors.some((e) => e.includes('lowercase'))).toBe(true)
  })

  it('should return error for negative maxRetries', () => {
    const errors = validateDLQConfig({
      queueName: 'my-dlq',
      maxRetries: -1,
    })

    expect(errors.some((e) => e.includes('non-negative'))).toBe(true)
  })
})

describe('shouldSendToDLQ', () => {
  it('should return false when attempts are below maxRetries', () => {
    const message = createMockMessage({ data: 'test' }, 1)

    expect(shouldSendToDLQ(message, 3)).toBe(false)
    expect(shouldSendToDLQ(message, 2)).toBe(false)
  })

  it('should return false when attempts equal maxRetries', () => {
    const message = createMockMessage({ data: 'test' }, 3)

    expect(shouldSendToDLQ(message, 3)).toBe(false)
  })

  it('should return true when attempts exceed maxRetries', () => {
    const message = createMockMessage({ data: 'test' }, 4)

    expect(shouldSendToDLQ(message, 3)).toBe(true)
  })

  it('should use default maxRetries of 3', () => {
    const message3 = createMockMessage({ data: 'test' }, 3)
    const message4 = createMockMessage({ data: 'test' }, 4)

    expect(shouldSendToDLQ(message3)).toBe(false)
    expect(shouldSendToDLQ(message4)).toBe(true)
  })
})

describe('extractOriginalMessage', () => {
  it('should extract the original message from a DLQ message', () => {
    const originalBody = { to: 'user@example.com', subject: 'Hello' }
    const dlqMessage: DeadLetterMessage<typeof originalBody> = {
      originalQueue: 'email',
      originalMessage: originalBody,
      error: 'Failed',
      attempts: 3,
      failedAt: new Date().toISOString(),
      originalMessageId: 'msg-123',
    }

    const extracted = extractOriginalMessage(dlqMessage)

    expect(extracted).toEqual(originalBody)
  })
})

describe('isDeadLetterMessage', () => {
  it('should return true for valid DLQ messages', () => {
    const dlqMessage: DeadLetterMessage = {
      originalQueue: 'email',
      originalMessage: { data: 'test' },
      error: 'Failed',
      attempts: 3,
      failedAt: new Date().toISOString(),
      originalMessageId: 'msg-123',
    }

    expect(isDeadLetterMessage(dlqMessage)).toBe(true)
  })

  it('should return true for DLQ message with optional stack', () => {
    const dlqMessage: DeadLetterMessage = {
      originalQueue: 'email',
      originalMessage: { data: 'test' },
      error: 'Failed',
      stack: 'Error: Failed\n    at ...',
      attempts: 3,
      failedAt: new Date().toISOString(),
      originalMessageId: 'msg-123',
    }

    expect(isDeadLetterMessage(dlqMessage)).toBe(true)
  })

  it('should return false for non-DLQ messages', () => {
    expect(isDeadLetterMessage(null)).toBe(false)
    expect(isDeadLetterMessage(undefined)).toBe(false)
    expect(isDeadLetterMessage({})).toBe(false)
    expect(isDeadLetterMessage({ originalQueue: 'email' })).toBe(false)
    expect(isDeadLetterMessage('string')).toBe(false)
    expect(isDeadLetterMessage(123)).toBe(false)
  })

  it('should return false for incomplete DLQ messages', () => {
    // Missing originalMessageId
    expect(
      isDeadLetterMessage({
        originalQueue: 'email',
        originalMessage: {},
        error: 'Failed',
        attempts: 3,
        failedAt: new Date().toISOString(),
      })
    ).toBe(false)

    // Missing attempts
    expect(
      isDeadLetterMessage({
        originalQueue: 'email',
        originalMessage: {},
        error: 'Failed',
        failedAt: new Date().toISOString(),
        originalMessageId: 'msg-123',
      })
    ).toBe(false)
  })
})

describe('defineDLQConsumer', () => {
  it('should create a queue config for DLQ processing', async () => {
    let processedMessage: DeadLetterMessage | null = null

    const config = defineDLQConsumer<{ email: string }>(async (dlqMessage) => {
      processedMessage = dlqMessage
    })

    expect(config.config.maxRetries).toBe(1)
    expect(config.process).toBeDefined()
  })

  it('should auto-ack messages after processing', async () => {
    let acked = false
    const config = defineDLQConsumer(async () => {
      // Process
    })

    const mockMessage: QueueMessage<DeadLetterMessage> = {
      id: 'dlq-msg-1',
      body: {
        originalQueue: 'email',
        originalMessage: { data: 'test' },
        error: 'Failed',
        attempts: 3,
        failedAt: new Date().toISOString(),
        originalMessageId: 'msg-123',
      },
      timestamp: new Date(),
      attempts: 1,
      ack: () => {
        acked = true
      },
      retry: () => {},
      deadLetter: () => {},
    }

    await config.process(mockMessage)

    expect(acked).toBe(true)
  })
})
