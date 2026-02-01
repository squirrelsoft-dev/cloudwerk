/**
 * KV Cache Helpers for Linkly
 */

import { LINKLY_CACHE } from '@cloudwerk/core/bindings'

/** Cache TTL in seconds (1 hour) */
const CACHE_TTL = 3600

/**
 * Get a cached URL by its short code
 */
export async function getCachedUrl(code: string): Promise<string | null> {
  return LINKLY_CACHE.get(`url:${code}`)
}

/**
 * Cache a URL by its short code
 */
export async function cacheUrl(code: string, url: string): Promise<void> {
  await LINKLY_CACHE.put(`url:${code}`, url, {
    expirationTtl: CACHE_TTL,
  })
}
