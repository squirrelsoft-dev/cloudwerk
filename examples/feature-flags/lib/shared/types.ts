// Shared types for the service layer

/**
 * Branded type for SQL queries to prevent SQL injection
 * Only use the sql() function to create SqlQuery values
 */
export type SqlQuery = string & { __brand: 'sql' }

/**
 * Create a branded SQL query string
 * This should only be used with static SQL strings
 */
export function sql(query: string): SqlQuery {
  return query as SqlQuery
}

/**
 * Request context passed to all mutations
 * Contains user information for audit logging
 */
export interface RequestContext {
  userId?: string
  userEmail?: string
}

/**
 * Represents a change to a field for audit logging
 */
export interface FieldChange<T = unknown> {
  old: T
  new: T
}

/**
 * Collection of field changes for audit logging
 */
export type Changes = Record<string, FieldChange>
