/**
 * @cloudwerk/auth - RBAC Role Resolution
 *
 * Role hierarchy resolution and checking.
 */

import type { RBACConfig, RBACUser } from './types.js'

// ============================================================================
// Role Resolution
// ============================================================================

/**
 * Get all roles a user has, including inherited roles.
 *
 * @param config - RBAC configuration
 * @param roleName - Role to expand
 * @param visited - Set of already visited roles (for cycle detection)
 * @returns Set of all roles including inherited ones
 */
export function expandRole(
  config: RBACConfig,
  roleName: string,
  visited: Set<string> = new Set()
): Set<string> {
  // Cycle detection
  if (visited.has(roleName)) {
    return new Set()
  }
  visited.add(roleName)

  const roles = new Set<string>([roleName])
  const role = config.roles[roleName]

  if (!role) {
    return roles
  }

  // Add inherited roles
  if (role.inherits) {
    for (const parentRole of role.inherits) {
      const expandedRoles = expandRole(config, parentRole, visited)
      for (const r of expandedRoles) {
        roles.add(r)
      }
    }
  }

  return roles
}

/**
 * Get all effective roles for a user.
 *
 * @param config - RBAC configuration
 * @param user - User to get roles for
 * @returns Set of all roles the user has
 */
export function getUserRoles(config: RBACConfig, user: RBACUser): Set<string> {
  const roles = new Set<string>()

  if (!user.roles) {
    // Add default role if configured
    if (config.defaultRole) {
      const expandedRoles = expandRole(config, config.defaultRole)
      for (const role of expandedRoles) {
        roles.add(role)
      }
    }
    return roles
  }

  for (const roleName of user.roles) {
    const expandedRoles = expandRole(config, roleName)
    for (const role of expandedRoles) {
      roles.add(role)
    }
  }

  return roles
}

/**
 * Check if user has a specific role.
 *
 * @param config - RBAC configuration
 * @param user - User to check
 * @param role - Role to check for
 * @returns True if user has the role (directly or through inheritance)
 */
export function checkRole(config: RBACConfig, user: RBACUser, role: string): boolean {
  const userRoles = getUserRoles(config, user)
  return userRoles.has(role)
}

/**
 * Check if user has any of the specified roles.
 *
 * @param config - RBAC configuration
 * @param user - User to check
 * @param roles - Roles to check for
 * @returns True if user has any of the roles
 */
export function checkAnyRole(config: RBACConfig, user: RBACUser, roles: string[]): boolean {
  const userRoles = getUserRoles(config, user)
  return roles.some((role) => userRoles.has(role))
}

/**
 * Check if user has all of the specified roles.
 *
 * @param config - RBAC configuration
 * @param user - User to check
 * @param roles - Roles to check for
 * @returns True if user has all the roles
 */
export function checkAllRoles(config: RBACConfig, user: RBACUser, roles: string[]): boolean {
  const userRoles = getUserRoles(config, user)
  return roles.every((role) => userRoles.has(role))
}

// ============================================================================
// Role Validation
// ============================================================================

/**
 * Validate RBAC configuration.
 *
 * Checks for:
 * - Circular inheritance
 * - Missing inherited roles
 * - Invalid default role
 * - Invalid super admin role
 *
 * @param config - RBAC configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateRBACConfig(config: RBACConfig): string[] {
  const errors: string[] = []
  const roleNames = new Set(Object.keys(config.roles))

  // Check each role
  for (const [roleName, role] of Object.entries(config.roles)) {
    // Check inherited roles exist
    if (role.inherits) {
      for (const parentRole of role.inherits) {
        if (!roleNames.has(parentRole)) {
          errors.push(
            `Role "${roleName}" inherits from non-existent role "${parentRole}"`
          )
        }
      }

      // Check for circular inheritance
      const circularPath = detectCircularInheritance(config, roleName)
      if (circularPath) {
        errors.push(
          `Circular inheritance detected: ${circularPath.join(' -> ')}`
        )
      }
    }
  }

  // Check default role exists
  if (config.defaultRole && !roleNames.has(config.defaultRole)) {
    errors.push(`Default role "${config.defaultRole}" does not exist`)
  }

  // Check super admin role exists
  if (config.superAdminRole && !roleNames.has(config.superAdminRole)) {
    errors.push(`Super admin role "${config.superAdminRole}" does not exist`)
  }

  return errors
}

/**
 * Detect circular inheritance in role hierarchy.
 *
 * @param config - RBAC configuration
 * @param startRole - Role to start checking from
 * @returns Path of circular inheritance, or null if none
 */
function detectCircularInheritance(
  config: RBACConfig,
  startRole: string
): string[] | null {
  const visited = new Set<string>()
  const path: string[] = []

  function visit(roleName: string): string[] | null {
    if (path.includes(roleName)) {
      // Found cycle
      return [...path, roleName]
    }

    if (visited.has(roleName)) {
      return null
    }

    visited.add(roleName)
    path.push(roleName)

    const role = config.roles[roleName]
    if (role?.inherits) {
      for (const parentRole of role.inherits) {
        const result = visit(parentRole)
        if (result) {
          return result
        }
      }
    }

    path.pop()
    return null
  }

  return visit(startRole)
}
