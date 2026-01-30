/**
 * @cloudwerk/auth - defineRBAC()
 *
 * Role-based access control definition for convention-based setup.
 */

import type { RBACDefinition, RoleDefinition } from './types.js'

/**
 * Define role-based access control configuration.
 *
 * Used in `app/auth/rbac.ts` to define roles, permissions, and hierarchy.
 *
 * @param rbac - RBAC configuration
 * @returns The RBAC configuration
 *
 * @example
 * ```typescript
 * // app/auth/rbac.ts
 * import { defineRBAC } from '@cloudwerk/auth/convention'
 *
 * export default defineRBAC({
 *   roles: [
 *     {
 *       id: 'admin',
 *       name: 'Administrator',
 *       permissions: ['*'], // Full access
 *     },
 *     {
 *       id: 'editor',
 *       name: 'Editor',
 *       permissions: [
 *         'posts:create',
 *         'posts:read',
 *         'posts:update',
 *         'posts:delete:own', // Can only delete own posts
 *         'media:*', // Full media access
 *       ],
 *     },
 *     {
 *       id: 'viewer',
 *       name: 'Viewer',
 *       permissions: [
 *         'posts:read',
 *         'media:read',
 *       ],
 *     },
 *   ],
 *   defaultRole: 'viewer',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With role hierarchy
 * import { defineRBAC } from '@cloudwerk/auth/convention'
 *
 * export default defineRBAC({
 *   roles: [
 *     {
 *       id: 'super-admin',
 *       name: 'Super Administrator',
 *       permissions: ['*'],
 *       description: 'Full system access including user management',
 *     },
 *     {
 *       id: 'admin',
 *       name: 'Administrator',
 *       permissions: [
 *         'users:read',
 *         'settings:*',
 *       ],
 *     },
 *     {
 *       id: 'manager',
 *       name: 'Manager',
 *       permissions: [
 *         'team:*',
 *         'reports:read',
 *       ],
 *     },
 *     {
 *       id: 'user',
 *       name: 'User',
 *       permissions: [
 *         'profile:*:own',
 *       ],
 *     },
 *   ],
 *   hierarchy: {
 *     'super-admin': ['admin'],           // super-admin inherits from admin
 *     'admin': ['manager'],                // admin inherits from manager
 *     'manager': ['user'],                 // manager inherits from user
 *   },
 *   defaultRole: 'user',
 * })
 * ```
 */
export function defineRBAC(rbac: RBACDefinition): RBACDefinition {
  return rbac
}

/**
 * Type guard to check if a value is an RBACDefinition.
 */
export function isRBACDefinition(value: unknown): value is RBACDefinition {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const def = value as Record<string, unknown>

  // Must have roles array
  if (!Array.isArray(def.roles)) {
    return false
  }

  // Each role must have id and permissions
  return def.roles.every((role: unknown) => {
    if (typeof role !== 'object' || role === null) return false
    const r = role as Record<string, unknown>
    return typeof r.id === 'string' && Array.isArray(r.permissions)
  })
}

/**
 * Helper to create a role definition.
 */
export function role(
  id: string,
  name: string,
  permissions: string[],
  description?: string
): RoleDefinition {
  return { id, name, permissions, description }
}

/**
 * Common permission patterns.
 */
export const permissions = {
  /**
   * Full access to everything.
   */
  all: '*',

  /**
   * Full access to a resource.
   */
  resource: (resource: string) => `${resource}:*`,

  /**
   * Read access to a resource.
   */
  read: (resource: string) => `${resource}:read`,

  /**
   * Write access (create, update, delete) to a resource.
   */
  write: (resource: string) => `${resource}:write`,

  /**
   * Create access to a resource.
   */
  create: (resource: string) => `${resource}:create`,

  /**
   * Update access to a resource.
   */
  update: (resource: string) => `${resource}:update`,

  /**
   * Delete access to a resource.
   */
  delete: (resource: string) => `${resource}:delete`,

  /**
   * Access only to own resources.
   */
  own: (permission: string) => `${permission}:own`,
}

/**
 * Expand role permissions including inherited roles.
 */
export function expandRolePermissions(
  roleId: string,
  roles: RoleDefinition[],
  hierarchy?: Record<string, string[]>,
  visited = new Set<string>()
): string[] {
  // Prevent infinite loops
  if (visited.has(roleId)) {
    return []
  }
  visited.add(roleId)

  // Find the role
  const role = roles.find((r) => r.id === roleId)
  if (!role) {
    return []
  }

  // Start with role's own permissions
  const permissions = [...role.permissions]

  // Add inherited permissions
  const inheritsFrom = hierarchy?.[roleId] ?? []
  for (const parentRoleId of inheritsFrom) {
    const parentPermissions = expandRolePermissions(
      parentRoleId,
      roles,
      hierarchy,
      visited
    )
    permissions.push(...parentPermissions)
  }

  // Deduplicate
  return [...new Set(permissions)]
}

/**
 * Get all role IDs from an RBAC definition.
 */
export function getRoleIds(rbac: RBACDefinition): string[] {
  return rbac.roles.map((r) => r.id)
}

/**
 * Get all unique permissions from an RBAC definition.
 */
export function getAllPermissions(rbac: RBACDefinition): string[] {
  const allPermissions = new Set<string>()

  for (const role of rbac.roles) {
    for (const permission of role.permissions) {
      allPermissions.add(permission)
    }
  }

  return [...allPermissions]
}
