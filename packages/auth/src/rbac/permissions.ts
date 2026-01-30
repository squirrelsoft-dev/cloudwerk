/**
 * @cloudwerk/auth - RBAC Permission Checking
 *
 * Permission checking logic with wildcard and ownership support.
 */

import type { RBACConfig, RBACUser, Resource } from './types.js'

// ============================================================================
// Permission Matching
// ============================================================================

/**
 * Check if a permission pattern matches a target permission.
 *
 * Supports:
 * - Exact match: 'posts:read' matches 'posts:read'
 * - Wildcard all: '*' matches everything
 * - Namespace wildcard: 'posts:*' matches 'posts:read', 'posts:write', etc.
 * - Deep wildcard: 'admin:**' matches 'admin:users:read', 'admin:posts:delete', etc.
 *
 * @param pattern - Permission pattern to check (may contain wildcards)
 * @param target - Target permission to match against
 * @returns True if pattern matches target
 *
 * @example
 * ```typescript
 * matchPermission('*', 'posts:read')           // true
 * matchPermission('posts:*', 'posts:read')     // true
 * matchPermission('posts:*', 'users:read')     // false
 * matchPermission('admin:**', 'admin:users:read') // true
 * matchPermission('posts:read', 'posts:read')  // true
 * ```
 */
export function matchPermission(pattern: string, target: string): boolean {
  // Exact match
  if (pattern === target) {
    return true
  }

  // Global wildcard
  if (pattern === '*') {
    return true
  }

  // Deep wildcard (matches multiple segments)
  if (pattern.endsWith(':**')) {
    const prefix = pattern.slice(0, -3) // Remove ':**'
    return target === prefix || target.startsWith(prefix + ':')
  }

  // Namespace wildcard (matches one segment)
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -2) // Remove ':*'
    const segments = target.split(':')
    const patternSegments = prefix.split(':')

    // Target must have exactly one more segment than pattern prefix
    if (segments.length !== patternSegments.length + 1) {
      return false
    }

    // All prefix segments must match
    for (let i = 0; i < patternSegments.length; i++) {
      if (segments[i] !== patternSegments[i]) {
        return false
      }
    }

    return true
  }

  return false
}

/**
 * Check if any permission in a set matches a target permission.
 *
 * @param permissions - Set of permission patterns
 * @param target - Target permission to check
 * @returns True if any permission matches
 */
export function hasMatchingPermission(permissions: Set<string>, target: string): boolean {
  for (const permission of permissions) {
    if (matchPermission(permission, target)) {
      return true
    }
  }
  return false
}

// ============================================================================
// Ownership Checking
// ============================================================================

/**
 * Check if a permission requires ownership.
 *
 * Ownership permissions end with ':own' suffix.
 *
 * @param permission - Permission to check
 * @returns True if permission requires ownership
 *
 * @example
 * ```typescript
 * isOwnershipPermission('posts:read:own')  // true
 * isOwnershipPermission('posts:read')      // false
 * ```
 */
export function isOwnershipPermission(permission: string): boolean {
  return permission.endsWith(':own')
}

/**
 * Get the base permission from an ownership permission.
 *
 * @param permission - Ownership permission
 * @returns Base permission without ':own' suffix
 *
 * @example
 * ```typescript
 * getBasePermission('posts:read:own')  // 'posts:read'
 * getBasePermission('posts:read')      // 'posts:read'
 * ```
 */
export function getBasePermission(permission: string): string {
  if (isOwnershipPermission(permission)) {
    return permission.slice(0, -4) // Remove ':own'
  }
  return permission
}

/**
 * Check if a user owns a resource.
 *
 * @param user - User to check
 * @param resource - Resource to check ownership of
 * @returns True if user owns the resource
 */
export function checkOwnership(user: RBACUser, resource: Resource): boolean {
  // No resource or no owner specified
  if (!resource || resource.ownerId === undefined) {
    return false
  }

  return resource.ownerId === user.id
}

// ============================================================================
// Permission Resolution
// ============================================================================

/**
 * Get all permissions for a role, including inherited permissions.
 *
 * @param config - RBAC configuration
 * @param roleName - Role to get permissions for
 * @param visited - Set of already visited roles (for cycle detection)
 * @returns Set of all permissions for the role
 */
export function getRolePermissions(
  config: RBACConfig,
  roleName: string,
  visited: Set<string> = new Set()
): Set<string> {
  // Cycle detection
  if (visited.has(roleName)) {
    return new Set()
  }
  visited.add(roleName)

  const role = config.roles[roleName]
  if (!role) {
    return new Set()
  }

  const permissions = new Set<string>(role.permissions)

  // Add inherited permissions
  if (role.inherits) {
    for (const parentRole of role.inherits) {
      const parentPermissions = getRolePermissions(config, parentRole, visited)
      for (const permission of parentPermissions) {
        permissions.add(permission)
      }
    }
  }

  return permissions
}

/**
 * Get all effective permissions for a user.
 *
 * @param config - RBAC configuration
 * @param user - User to get permissions for
 * @returns Set of all permissions the user has
 */
export function getUserPermissions(config: RBACConfig, user: RBACUser): Set<string> {
  const permissions = new Set<string>()

  // Add direct user permissions
  if (user.permissions) {
    for (const permission of user.permissions) {
      permissions.add(permission)
    }
  }

  // Add role-based permissions
  if (user.roles) {
    for (const roleName of user.roles) {
      // Check for super admin role
      if (config.superAdminRole && roleName === config.superAdminRole) {
        permissions.add('*')
      }

      const rolePermissions = getRolePermissions(config, roleName)
      for (const permission of rolePermissions) {
        permissions.add(permission)
      }
    }
  }

  return permissions
}

/**
 * Check if user has a specific permission.
 *
 * @param config - RBAC configuration
 * @param user - User to check
 * @param permission - Permission to check for
 * @param resource - Optional resource for ownership checks
 * @returns True if user has the permission
 */
export function checkPermission(
  config: RBACConfig,
  user: RBACUser,
  permission: string,
  resource?: Resource
): boolean {
  const userPermissions = getUserPermissions(config, user)

  // First check for direct or wildcard match
  if (hasMatchingPermission(userPermissions, permission)) {
    return true
  }

  // Check for ownership permission
  if (resource && !isOwnershipPermission(permission)) {
    // User might have the :own variant
    const ownershipPermission = `${permission}:own`
    if (hasMatchingPermission(userPermissions, ownershipPermission)) {
      // Must own the resource
      return checkOwnership(user, resource)
    }
  }

  return false
}
