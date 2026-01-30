/**
 * @cloudwerk/auth - RBAC Types
 *
 * Type definitions for Role-Based Access Control.
 */

// ============================================================================
// Role Types
// ============================================================================

/**
 * Role definition.
 */
export interface RoleDefinition {
  /** Role identifier */
  name: string

  /** Human-readable description */
  description?: string

  /** Permissions granted to this role */
  permissions: string[]

  /** Roles this role inherits from */
  inherits?: string[]
}

/**
 * Permission definition.
 */
export interface PermissionDefinition {
  /** Permission identifier */
  name: string

  /** Human-readable description */
  description?: string
}

// ============================================================================
// RBAC Configuration
// ============================================================================

/**
 * RBAC configuration.
 */
export interface RBACConfig {
  /** Role definitions */
  roles: Record<string, RoleDefinition>

  /** Permission definitions (optional, for documentation) */
  permissions?: Record<string, PermissionDefinition>

  /** Default role for new users */
  defaultRole?: string

  /** Super admin role (has all permissions) */
  superAdminRole?: string
}

// ============================================================================
// RBAC Checker Types
// ============================================================================

/**
 * User with roles for RBAC checking.
 */
export interface RBACUser {
  /** User ID */
  id: string

  /** User roles */
  roles?: string[]

  /** User permissions (in addition to role-based permissions) */
  permissions?: string[]

  /** User data for ownership checks */
  data?: Record<string, unknown>
}

/**
 * Resource for ownership checks.
 */
export interface Resource {
  /** Resource owner ID */
  ownerId?: string

  /** Resource data */
  [key: string]: unknown
}

/**
 * RBAC checker interface.
 */
export interface RBACChecker {
  /**
   * Check if user has a specific role.
   *
   * @param user - User to check
   * @param role - Role to check for
   * @returns True if user has the role (directly or through inheritance)
   */
  hasRole(user: RBACUser, role: string): boolean

  /**
   * Check if user has a specific permission.
   *
   * @param user - User to check
   * @param permission - Permission to check for
   * @param resource - Optional resource for ownership checks
   * @returns True if user has the permission
   */
  hasPermission(user: RBACUser, permission: string, resource?: Resource): boolean

  /**
   * Check if user has any of the specified roles.
   *
   * @param user - User to check
   * @param roles - Roles to check for
   * @returns True if user has any of the roles
   */
  hasAnyRole(user: RBACUser, roles: string[]): boolean

  /**
   * Check if user has all of the specified roles.
   *
   * @param user - User to check
   * @param roles - Roles to check for
   * @returns True if user has all the roles
   */
  hasAllRoles(user: RBACUser, roles: string[]): boolean

  /**
   * Check if user has any of the specified permissions.
   *
   * @param user - User to check
   * @param permissions - Permissions to check for
   * @param resource - Optional resource for ownership checks
   * @returns True if user has any of the permissions
   */
  hasAnyPermission(user: RBACUser, permissions: string[], resource?: Resource): boolean

  /**
   * Check if user has all of the specified permissions.
   *
   * @param user - User to check
   * @param permissions - Permissions to check for
   * @param resource - Optional resource for ownership checks
   * @returns True if user has all the permissions
   */
  hasAllPermissions(user: RBACUser, permissions: string[], resource?: Resource): boolean

  /**
   * Get all permissions for a user (including inherited permissions).
   *
   * @param user - User to get permissions for
   * @returns Set of all permissions the user has
   */
  getEffectivePermissions(user: RBACUser): Set<string>

  /**
   * Get all roles for a user (including inherited roles).
   *
   * @param user - User to get roles for
   * @returns Set of all roles the user has
   */
  getEffectiveRoles(user: RBACUser): Set<string>
}
