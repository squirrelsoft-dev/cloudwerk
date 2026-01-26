/**
 * create-cloudwerk-app - Validation Functions
 *
 * Project name and directory validation utilities.
 */

import fs from 'node:fs'
import path from 'node:path'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean
  /** Error message if validation failed */
  error?: string
}

// ============================================================================
// Name Validation
// ============================================================================

/**
 * Regular expression for valid npm package names.
 *
 * Rules:
 * - Must be lowercase
 * - Can contain letters, numbers, hyphens, dots, underscores
 * - Cannot start with a dot or underscore
 * - Can be scoped (@scope/name)
 */
const NPM_NAME_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/**
 * Validate a project name for use as an npm package name.
 *
 * @param name - The project name to validate
 * @returns Validation result with error message if invalid
 */
export function validateProjectName(name: string): ValidationResult {
  // Check for empty name
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Project name cannot be empty',
    }
  }

  const trimmedName = name.trim()

  // Check for path traversal attempts
  if (trimmedName.includes('..') || trimmedName.includes('/') || trimmedName.includes('\\')) {
    // Allow scoped packages with single forward slash
    if (!trimmedName.startsWith('@') || (trimmedName.match(/\//g) || []).length > 1) {
      return {
        valid: false,
        error: 'Project name cannot contain path traversal characters (.. or / or \\)',
      }
    }
  }

  // Check for reserved names early (before other validations)
  const reservedNames = ['node_modules', '.git', '.svn', '.hg', 'package.json']
  if (reservedNames.includes(trimmedName)) {
    return {
      valid: false,
      error: `Project name "${trimmedName}" is reserved`,
    }
  }

  // Check for uppercase letters
  if (trimmedName !== trimmedName.toLowerCase()) {
    return {
      valid: false,
      error: 'Project name must be lowercase',
    }
  }

  // Validate against npm package name rules
  if (!NPM_NAME_REGEX.test(trimmedName)) {
    return {
      valid: false,
      error:
        'Project name must be a valid npm package name (lowercase letters, numbers, hyphens, dots, underscores)',
    }
  }

  return { valid: true }
}

// ============================================================================
// Directory Validation
// ============================================================================

/**
 * Check if a directory already exists.
 *
 * @param dirPath - Path to the directory to check
 * @returns Validation result with error message if directory exists
 */
export function validateDirectory(dirPath: string): ValidationResult {
  if (fs.existsSync(dirPath)) {
    // Check if it's a directory
    const stats = fs.statSync(dirPath)
    if (stats.isDirectory()) {
      // Check if directory is empty
      const contents = fs.readdirSync(dirPath)
      if (contents.length > 0) {
        return {
          valid: false,
          error: `Directory "${path.basename(dirPath)}" already exists and is not empty`,
        }
      }
      // Empty directory is OK
      return { valid: true }
    }
    return {
      valid: false,
      error: `"${path.basename(dirPath)}" already exists and is not a directory`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Combined Validation
// ============================================================================

/**
 * Validate project name and target directory together.
 *
 * @param projectName - Name of the project
 * @param targetDir - Target directory path (defaults to cwd + projectName)
 * @returns Validation result with error message if invalid
 */
export function validateProject(
  projectName: string,
  targetDir?: string
): ValidationResult {
  // Validate project name first
  const nameResult = validateProjectName(projectName)
  if (!nameResult.valid) {
    return nameResult
  }

  // Determine target directory
  const resolvedDir = targetDir || path.resolve(process.cwd(), projectName)

  // Validate directory
  return validateDirectory(resolvedDir)
}
