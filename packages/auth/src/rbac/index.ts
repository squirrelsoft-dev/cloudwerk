/**
 * @cloudwerk/auth - RBAC Module
 *
 * Role-Based Access Control for Cloudwerk applications.
 *
 * @example
 * ```typescript
 * import { createRBACChecker } from '@cloudwerk/auth/rbac'
 *
 * const rbac = createRBACChecker({
 *   roles: {
 *     admin: {
 *       name: 'admin',
 *       permissions: ['*'],
 *     },
 *     editor: {
 *       name: 'editor',
 *       permissions: ['posts:*', 'media:read'],
 *     },
 *     author: {
 *       name: 'author',
 *       permissions: ['posts:read', 'posts:create', 'posts:update:own'],
 *       inherits: ['viewer'],
 *     },
 *     viewer: {
 *       name: 'viewer',
 *       permissions: ['posts:read', 'media:read'],
 *     },
 *   },
 *   defaultRole: 'viewer',
 *   superAdminRole: 'admin',
 * })
 *
 * // Check permissions
 * if (rbac.hasPermission(user, 'posts:delete')) {
 *   await deletePost(postId)
 * }
 *
 * // Check with ownership
 * if (rbac.hasPermission(user, 'posts:update', { ownerId: post.authorId })) {
 *   await updatePost(postId, data)
 * }
 * ```
 */

import type { RBACConfig, RBACChecker, RBACUser, Resource } from './types.js'
import { checkRole, checkAnyRole, checkAllRoles, getUserRoles } from './roles.js'
import { checkPermission, getUserPermissions, hasMatchingPermission } from './permissions.js'

// Re-export types
export type {
  RBACConfig,
  RBACChecker,
  RBACUser,
  Resource,
  RoleDefinition,
  PermissionDefinition,
} from './types.js'

// Re-export utilities
export {
  matchPermission,
  hasMatchingPermission,
  isOwnershipPermission,
  getBasePermission,
  checkOwnership,
  getRolePermissions,
  getUserPermissions,
  checkPermission,
} from './permissions.js'

export {
  expandRole,
  getUserRoles,
  checkRole,
  checkAnyRole,
  checkAllRoles,
  validateRBACConfig,
} from './roles.js'

// ============================================================================
// RBAC Checker Factory
// ============================================================================

/**
 * Create an RBAC checker with the given configuration.
 *
 * @param config - RBAC configuration
 * @returns RBAC checker instance
 *
 * @example
 * ```typescript
 * const rbac = createRBACChecker({
 *   roles: {
 *     admin: {
 *       name: 'admin',
 *       description: 'Full system access',
 *       permissions: ['*'],
 *     },
 *     moderator: {
 *       name: 'moderator',
 *       description: 'Content moderation',
 *       permissions: ['posts:*', 'comments:*'],
 *       inherits: ['user'],
 *     },
 *     user: {
 *       name: 'user',
 *       description: 'Regular user',
 *       permissions: ['posts:read', 'comments:read', 'comments:create:own'],
 *     },
 *   },
 *   defaultRole: 'user',
 *   superAdminRole: 'admin',
 * })
 *
 * // In a route handler
 * export async function DELETE(request: Request, ctx: Context) {
 *   const user = await getAuthenticatedUser(ctx)
 *
 *   if (!rbac.hasPermission(user, 'posts:delete')) {
 *     return json({ error: 'Forbidden' }, { status: 403 })
 *   }
 *
 *   // ... delete post
 * }
 * ```
 */
export function createRBACChecker(config: RBACConfig): RBACChecker {
  return {
    hasRole(user: RBACUser, role: string): boolean {
      return checkRole(config, user, role)
    },

    hasPermission(user: RBACUser, permission: string, resource?: Resource): boolean {
      return checkPermission(config, user, permission, resource)
    },

    hasAnyRole(user: RBACUser, roles: string[]): boolean {
      return checkAnyRole(config, user, roles)
    },

    hasAllRoles(user: RBACUser, roles: string[]): boolean {
      return checkAllRoles(config, user, roles)
    },

    hasAnyPermission(user: RBACUser, permissions: string[], resource?: Resource): boolean {
      return permissions.some((permission) =>
        checkPermission(config, user, permission, resource)
      )
    },

    hasAllPermissions(user: RBACUser, permissions: string[], resource?: Resource): boolean {
      return permissions.every((permission) =>
        checkPermission(config, user, permission, resource)
      )
    },

    getEffectivePermissions(user: RBACUser): Set<string> {
      return getUserPermissions(config, user)
    },

    getEffectiveRoles(user: RBACUser): Set<string> {
      return getUserRoles(config, user)
    },
  }
}

// ============================================================================
// Middleware Helpers
// ============================================================================

/**
 * Create a middleware that requires a specific role.
 *
 * @param rbac - RBAC checker
 * @param role - Required role
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const requireAdmin = requireRole(rbac, 'admin')
 *
 * // In route config
 * export const config = {
 *   middleware: [requireAdmin],
 * }
 * ```
 */
export function requireRole(
  rbac: RBACChecker,
  role: string
): (user: RBACUser | null) => { allowed: boolean; error?: string } {
  return (user) => {
    if (!user) {
      return { allowed: false, error: 'Authentication required' }
    }
    if (!rbac.hasRole(user, role)) {
      return { allowed: false, error: `Role "${role}" required` }
    }
    return { allowed: true }
  }
}

/**
 * Create a middleware that requires any of the specified roles.
 *
 * @param rbac - RBAC checker
 * @param roles - Required roles (any)
 * @returns Middleware function
 */
export function requireAnyRole(
  rbac: RBACChecker,
  roles: string[]
): (user: RBACUser | null) => { allowed: boolean; error?: string } {
  return (user) => {
    if (!user) {
      return { allowed: false, error: 'Authentication required' }
    }
    if (!rbac.hasAnyRole(user, roles)) {
      return { allowed: false, error: `One of roles [${roles.join(', ')}] required` }
    }
    return { allowed: true }
  }
}

/**
 * Create a middleware that requires a specific permission.
 *
 * @param rbac - RBAC checker
 * @param permission - Required permission
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const requirePostsWrite = requirePermission(rbac, 'posts:write')
 *
 * // In route config
 * export const config = {
 *   middleware: [requirePostsWrite],
 * }
 * ```
 */
export function requirePermission(
  rbac: RBACChecker,
  permission: string
): (user: RBACUser | null, resource?: Resource) => { allowed: boolean; error?: string } {
  return (user, resource) => {
    if (!user) {
      return { allowed: false, error: 'Authentication required' }
    }
    if (!rbac.hasPermission(user, permission, resource)) {
      return { allowed: false, error: `Permission "${permission}" required` }
    }
    return { allowed: true }
  }
}

/**
 * Create a middleware that requires any of the specified permissions.
 *
 * @param rbac - RBAC checker
 * @param permissions - Required permissions (any)
 * @returns Middleware function
 */
export function requireAnyPermission(
  rbac: RBACChecker,
  permissions: string[]
): (user: RBACUser | null, resource?: Resource) => { allowed: boolean; error?: string } {
  return (user, resource) => {
    if (!user) {
      return { allowed: false, error: 'Authentication required' }
    }
    if (!rbac.hasAnyPermission(user, permissions, resource)) {
      return { allowed: false, error: `One of permissions [${permissions.join(', ')}] required` }
    }
    return { allowed: true }
  }
}
