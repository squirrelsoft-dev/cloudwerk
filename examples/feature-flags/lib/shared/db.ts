// Database utilities

import { DB } from '@cloudwerk/core/bindings'
import type { SqlQuery } from './types'

/**
 * Execute a mutation query (INSERT, UPDATE, DELETE)
 * Returns nothing - mutations are fire-and-forget for consistency
 */
export async function mutate(query: SqlQuery, params: unknown[]): Promise<void> {
  await DB.prepare(query).bind(...params).run()
}

/**
 * Execute a SELECT query and return a single row
 */
export async function queryOne<T>(query: SqlQuery, params: unknown[]): Promise<T | null> {
  const result = await DB.prepare(query).bind(...params).first<T>()
  return result ?? null
}

/**
 * Execute a SELECT query and return all rows
 */
export async function queryAll<T>(query: SqlQuery): Promise<T[]> {
  const result = await DB.prepare(query).all<T>()
  return result.results ?? []
}

/**
 * Execute a SELECT query with params and return all rows
 */
export async function queryAllWithParams<T>(query: SqlQuery, params: unknown[]): Promise<T[]> {
  const result = await DB.prepare(query).bind(...params).all<T>()
  return result.results ?? []
}
