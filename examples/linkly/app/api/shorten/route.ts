/**
 * POST /api/shorten - Create a shortened link
 */

import type { CloudwerkHandler } from '@cloudwerk/core'
import { json, badRequest } from '@cloudwerk/core'
import { createLink, generateUniqueCode } from '../../lib/db'
import { cacheUrl } from '../../lib/cache'

interface ShortenRequest {
  url: string
}

interface ShortenResponse {
  code: string
  shortUrl: string
  url: string
}

/**
 * Validate that a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const POST: CloudwerkHandler = async (request, _context) => {
  // Parse request body
  let body: ShortenRequest
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  // Validate URL
  const { url } = body
  if (!url) {
    return badRequest('URL is required')
  }

  if (!isValidUrl(url)) {
    return badRequest('Invalid URL format. Must be a valid HTTP or HTTPS URL.')
  }

  // Generate unique short code
  const code = await generateUniqueCode()

  // Store in database
  await createLink(url, code)

  // Pre-cache in KV for fast redirects
  await cacheUrl(code, url)

  // Build response
  const origin = new URL(request.url).origin
  const response: ShortenResponse = {
    code,
    shortUrl: `${origin}/${code}`,
    url,
  }

  return json(response, 201)
}
