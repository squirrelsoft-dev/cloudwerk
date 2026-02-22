// Cache utilities for feature flags

import { FLAGSHIP_AUTH_SESSIONS } from '@cloudwerk/core/bindings'
import type { Flag, Segment } from '../types'

const FLAGS_CACHE_KEY = 'feature-flags:all'
const CACHE_TTL = 60 // 1 minute

export interface CacheData {
  flags: Flag[]
  segments: Segment[]
}

/**
 * Load cached flags and segments data
 * Returns null if cache miss or error
 */
export async function loadFromCache(): Promise<CacheData | null> {
  try {
    const cached = await FLAGSHIP_AUTH_SESSIONS.get(FLAGS_CACHE_KEY, 'json')
    return cached as CacheData | null
  } catch {
    return null
  }
}

/**
 * Store flags and segments data in cache
 */
export async function saveToCache(data: CacheData): Promise<void> {
  try {
    await FLAGSHIP_AUTH_SESSIONS.put(FLAGS_CACHE_KEY, JSON.stringify(data), {
      expirationTtl: CACHE_TTL,
    })
  } catch {
    // Cache write failed, continue silently
  }
}

/**
 * Invalidate the flags cache
 * Called after any mutation to flags or segments
 */
export async function invalidateCache(): Promise<void> {
  try {
    await FLAGSHIP_AUTH_SESSIONS.delete(FLAGS_CACHE_KEY)
  } catch {
    // Ignore cache invalidation errors
  }
}
