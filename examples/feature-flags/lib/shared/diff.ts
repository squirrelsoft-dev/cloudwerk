// Diff utilities for detecting changes between objects

import type { Changes, FieldChange } from './types'

/**
 * Stable JSON stringify that sorts object keys to ensure consistent output
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k])).join(',') + '}'
}

/**
 * Compare two values and return a FieldChange if they differ
 * Uses stable serialization to handle objects with different key ordering
 */
export function diffValue<T>(oldValue: T, newValue: T): FieldChange<T> | null {
  if (stableStringify(oldValue) === stableStringify(newValue)) {
    return null
  }

  return { old: oldValue, new: newValue }
}

/**
 * Build a changes object from old and new values
 * Only includes fields that have changed
 */
export function buildChanges<T extends object>(
  oldObj: T,
  newObj: Partial<T>,
  fields: (keyof T)[]
): Changes {
  const changes: Changes = {}

  for (const field of fields) {
    if (field in newObj) {
      const oldValue = oldObj[field]
      const newValue = newObj[field]
      const change = diffValue(oldValue, newValue)
      if (change) {
        changes[field as string] = change
      }
    }
  }

  return changes
}
