/**
 * D1 Database Helpers for Linkly
 */

import { DB } from '@cloudwerk/core/bindings'

export interface Link {
  id: string
  url: string
  code: string
  created_at: string
  clicks: number
}

/**
 * Generate a random 6-character alphanumeric code
 */
export function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create a new shortened link
 */
export async function createLink(url: string, code: string): Promise<Link> {
  const id = crypto.randomUUID()

  await DB.prepare('INSERT INTO links (id, url, code) VALUES (?, ?, ?)')
    .bind(id, url, code)
    .run()

  return {
    id,
    url,
    code,
    created_at: new Date().toISOString(),
    clicks: 0,
  }
}

/**
 * Get a link by its short code
 */
export async function getLinkByCode(code: string): Promise<Link | null> {
  const result = await DB.prepare('SELECT * FROM links WHERE code = ?')
    .bind(code)
    .first<Link>()
  return result
}

/**
 * Increment the click count for a link
 */
export async function incrementClicks(code: string): Promise<void> {
  await DB.prepare('UPDATE links SET clicks = clicks + 1 WHERE code = ?')
    .bind(code)
    .run()
}

/**
 * Check if a code already exists
 */
export async function codeExists(code: string): Promise<boolean> {
  const link = await getLinkByCode(code)
  return link !== null
}

/**
 * Generate a unique code that doesn't exist in the database
 */
export async function generateUniqueCode(): Promise<string> {
  let code = generateCode()
  let attempts = 0
  const maxAttempts = 10

  while (await codeExists(code) && attempts < maxAttempts) {
    code = generateCode()
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique code')
  }

  return code
}
