/**
 * Tests for defineTrigger()
 */

import { describe, it, expect } from 'vitest'
import {
  defineTrigger,
  isTriggerDefinition,
  getTriggerSourceType,
  parseDuration,
} from '../define-trigger.js'
import {
  TriggerConfigError,
  TriggerNoHandlerError,
  TriggerInvalidSourceError,
  TriggerInvalidCronError,
  TriggerInvalidWebhookPathError,
} from '../errors.js'
import type { ScheduledEvent, R2Event, WebhookEvent } from '../types.js'

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30)
    expect(parseDuration('1s')).toBe(1)
    expect(parseDuration('120s')).toBe(120)
  })

  it('parses minutes', () => {
    expect(parseDuration('5m')).toBe(300)
    expect(parseDuration('1m')).toBe(60)
    expect(parseDuration('30m')).toBe(1800)
  })

  it('parses hours', () => {
    expect(parseDuration('1h')).toBe(3600)
    expect(parseDuration('2h')).toBe(7200)
  })

  it('accepts numbers directly', () => {
    expect(parseDuration(60)).toBe(60)
    expect(parseDuration(0)).toBe(0)
  })

  it('throws on invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow(TriggerConfigError)
    expect(() => parseDuration('5d')).toThrow(TriggerConfigError)
    expect(() => parseDuration('5')).toThrow(TriggerConfigError)
    expect(() => parseDuration('')).toThrow(TriggerConfigError)
  })
})

describe('defineTrigger', () => {
  describe('scheduled triggers', () => {
    it('creates a scheduled trigger', () => {
      const trigger = defineTrigger({
        source: { type: 'scheduled', cron: '0 0 * * *' },
        handle: async (_event: ScheduledEvent) => {},
      })

      expect(trigger.__brand).toBe('cloudwerk-trigger')
      expect(trigger.source.type).toBe('scheduled')
      expect((trigger.source as { cron: string }).cron).toBe('0 0 * * *')
    })

    it('applies default retry config', () => {
      const trigger = defineTrigger({
        source: { type: 'scheduled', cron: '0 0 * * *' },
        handle: async () => {},
      })

      expect(trigger.retry).toEqual({
        maxAttempts: 3,
        delay: '1m',
        backoff: 'linear',
      })
    })

    it('merges custom retry config', () => {
      const trigger = defineTrigger({
        source: { type: 'scheduled', cron: '0 0 * * *' },
        retry: { maxAttempts: 5, delay: '30s' },
        handle: async () => {},
      })

      expect(trigger.retry.maxAttempts).toBe(5)
      expect(trigger.retry.delay).toBe('30s')
      expect(trigger.retry.backoff).toBe('linear') // default
    })

    it('validates cron expression', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: 'invalid' },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidCronError)
    })

    it('validates cron field count', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 *' }, // Only 3 fields
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidCronError)
    })

    it('accepts 6-field cron (with seconds)', () => {
      const trigger = defineTrigger({
        source: { type: 'scheduled', cron: '0 0 0 * * *' },
        handle: async () => {},
      })
      expect(trigger.source.type).toBe('scheduled')
    })
  })

  describe('R2 triggers', () => {
    it('creates an R2 trigger', () => {
      const trigger = defineTrigger({
        source: {
          type: 'r2',
          bucket: 'uploads',
          events: ['object-create'],
        },
        handle: async (_event: R2Event) => {},
      })

      expect(trigger.source.type).toBe('r2')
      expect((trigger.source as { bucket: string }).bucket).toBe('uploads')
    })

    it('validates R2 event types', () => {
      expect(() =>
        defineTrigger({
          source: {
            type: 'r2',
            bucket: 'uploads',
            events: ['invalid' as never],
          },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidSourceError)
    })

    it('requires at least one event type', () => {
      expect(() =>
        defineTrigger({
          source: {
            type: 'r2',
            bucket: 'uploads',
            events: [],
          },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidSourceError)
    })
  })

  describe('webhook triggers', () => {
    it('creates a webhook trigger', () => {
      const trigger = defineTrigger({
        source: {
          type: 'webhook',
          path: '/webhooks/stripe',
        },
        handle: async (_event: WebhookEvent) => {},
      })

      expect(trigger.source.type).toBe('webhook')
      expect((trigger.source as { path: string }).path).toBe('/webhooks/stripe')
    })

    it('validates webhook path starts with /', () => {
      expect(() =>
        defineTrigger({
          source: {
            type: 'webhook',
            path: 'webhooks/stripe',
          },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidWebhookPathError)
    })

    it('validates webhook path has no double slashes', () => {
      expect(() =>
        defineTrigger({
          source: {
            type: 'webhook',
            path: '/webhooks//stripe',
          },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidWebhookPathError)
    })

    it('validates webhook methods', () => {
      expect(() =>
        defineTrigger({
          source: {
            type: 'webhook',
            path: '/webhooks/test',
            methods: ['GET' as never],
          },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidSourceError)
    })
  })

  describe('queue triggers', () => {
    it('creates a queue trigger', () => {
      const trigger = defineTrigger({
        source: {
          type: 'queue',
          queue: 'email-queue',
        },
        handle: async () => {},
      })

      expect(trigger.source.type).toBe('queue')
      expect((trigger.source as { queue: string }).queue).toBe('email-queue')
    })

    it('requires queue name', () => {
      expect(() =>
        defineTrigger({
          source: {
            type: 'queue',
            queue: '',
          },
          handle: async () => {},
        })
      ).toThrow(TriggerInvalidSourceError)
    })
  })

  describe('validation', () => {
    it('requires a handler', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
        } as never)
      ).toThrow(TriggerNoHandlerError)
    })

    it('requires a source', () => {
      expect(() =>
        defineTrigger({
          handle: async () => {},
        } as never)
      ).toThrow(TriggerInvalidSourceError)
    })

    it('validates timeout range', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
          timeout: -1,
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)

      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
          timeout: 700000, // > 10 minutes
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)
    })

    it('validates retry maxAttempts', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
          retry: { maxAttempts: -1 },
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)

      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
          retry: { maxAttempts: 101 },
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)
    })

    it('validates retry backoff', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
          retry: { backoff: 'invalid' as never },
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)
    })

    it('validates name format', () => {
      expect(() =>
        defineTrigger({
          name: 'Invalid-Name',
          source: { type: 'scheduled', cron: '0 0 * * *' },
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)

      expect(() =>
        defineTrigger({
          name: '123invalid',
          source: { type: 'scheduled', cron: '0 0 * * *' },
          handle: async () => {},
        })
      ).toThrow(TriggerConfigError)
    })

    it('accepts valid name', () => {
      const trigger = defineTrigger({
        name: 'valid-name',
        source: { type: 'scheduled', cron: '0 0 * * *' },
        handle: async () => {},
      })
      expect(trigger.name).toBe('valid-name')
    })
  })

  describe('onError handler', () => {
    it('includes onError when provided', () => {
      const onError = async () => {}
      const trigger = defineTrigger({
        source: { type: 'scheduled', cron: '0 0 * * *' },
        handle: async () => {},
        onError,
      })

      expect(trigger.onError).toBe(onError)
    })

    it('validates onError is a function', () => {
      expect(() =>
        defineTrigger({
          source: { type: 'scheduled', cron: '0 0 * * *' },
          handle: async () => {},
          onError: 'not a function' as never,
        })
      ).toThrow(TriggerConfigError)
    })
  })
})

describe('isTriggerDefinition', () => {
  it('returns true for trigger definitions', () => {
    const trigger = defineTrigger({
      source: { type: 'scheduled', cron: '0 0 * * *' },
      handle: async () => {},
    })
    expect(isTriggerDefinition(trigger)).toBe(true)
  })

  it('returns false for non-trigger objects', () => {
    expect(isTriggerDefinition({})).toBe(false)
    expect(isTriggerDefinition(null)).toBe(false)
    expect(isTriggerDefinition(undefined)).toBe(false)
    expect(isTriggerDefinition('string')).toBe(false)
    expect(isTriggerDefinition({ __brand: 'other' })).toBe(false)
  })
})

describe('getTriggerSourceType', () => {
  it('returns the source type', () => {
    const scheduled = defineTrigger({
      source: { type: 'scheduled', cron: '0 0 * * *' },
      handle: async () => {},
    })
    expect(getTriggerSourceType(scheduled)).toBe('scheduled')

    const r2 = defineTrigger({
      source: { type: 'r2', bucket: 'uploads', events: ['object-create'] },
      handle: async () => {},
    })
    expect(getTriggerSourceType(r2)).toBe('r2')
  })
})
