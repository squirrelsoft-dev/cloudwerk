// Shared utility functions

/**
 * Generate a new UUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString()
}
