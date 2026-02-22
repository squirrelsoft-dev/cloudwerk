// Diff utilities for detecting changes between objects

import type { Changes, FieldChange } from './types'

/**
 * Compare two values and return a FieldChange if they differ
 * Handles JSON serialization for objects/arrays
 */
export function diffValue<T>(oldValue: T, newValue: T): FieldChange<T> | null {
  const oldStr = JSON.stringify(oldValue)
  const newStr = JSON.stringify(newValue)

  if (oldStr === newStr) {
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
