/**
 * @cloudwerk/cli - Durable Object Migration Tracker
 *
 * Tracks changes to durable object classes and generates appropriate
 * migration entries for wrangler.toml.
 */

import type { DurableObjectManifest, DurableObjectEntry } from '@cloudwerk/core/build'

// ============================================================================
// Types
// ============================================================================

export interface DurableObjectMigration {
  /** Migration tag (e.g., 'v1', 'v2', 'v202401151230') */
  tag: string
  /** New classes to create */
  new_classes?: string[]
  /** New classes that use SQLite storage */
  new_sqlite_classes?: string[]
  /** Classes to rename */
  renamed_classes?: Array<{ from: string; to: string }>
  /** Classes to delete */
  deleted_classes?: string[]
}

export interface MigrationDiff {
  /** Classes added since last manifest */
  added: DurableObjectEntry[]
  /** Classes removed since last manifest */
  removed: DurableObjectEntry[]
  /** Classes renamed (detected by file path match) */
  renamed: Array<{ old: DurableObjectEntry; new: DurableObjectEntry }>
  /** Classes with SQLite flag changed */
  sqliteChanged: Array<{ entry: DurableObjectEntry; newSqlite: boolean }>
}

// ============================================================================
// Migration Detection
// ============================================================================

/**
 * Detect changes between old and new manifests.
 */
export function detectMigrationDiff(
  oldManifest: DurableObjectManifest | null,
  newManifest: DurableObjectManifest
): MigrationDiff {
  const diff: MigrationDiff = {
    added: [],
    removed: [],
    renamed: [],
    sqliteChanged: [],
  }

  if (!oldManifest) {
    // All new entries are additions
    diff.added = [...newManifest.durableObjects]
    return diff
  }

  const oldByName = new Map<string, DurableObjectEntry>()
  const oldByPath = new Map<string, DurableObjectEntry>()
  for (const entry of oldManifest.durableObjects) {
    oldByName.set(entry.name, entry)
    oldByPath.set(entry.filePath, entry)
  }

  const newByName = new Map<string, DurableObjectEntry>()
  const newByPath = new Map<string, DurableObjectEntry>()
  for (const entry of newManifest.durableObjects) {
    newByName.set(entry.name, entry)
    newByPath.set(entry.filePath, entry)
  }

  // Find additions and renames
  for (const newEntry of newManifest.durableObjects) {
    const existingByName = oldByName.get(newEntry.name)

    if (existingByName) {
      // Check for SQLite flag change
      if (existingByName.sqlite !== newEntry.sqlite) {
        diff.sqliteChanged.push({
          entry: newEntry,
          newSqlite: newEntry.sqlite,
        })
      }
    } else {
      // New name - check if it's a rename (same file path)
      const existingByPath = oldByPath.get(newEntry.filePath)
      if (existingByPath) {
        // Same file, different name = rename
        diff.renamed.push({
          old: existingByPath,
          new: newEntry,
        })
      } else {
        // Truly new class
        diff.added.push(newEntry)
      }
    }
  }

  // Find removals
  for (const oldEntry of oldManifest.durableObjects) {
    const existingByName = newByName.get(oldEntry.name)
    const existingByPath = newByPath.get(oldEntry.filePath)

    if (!existingByName && !existingByPath) {
      // Completely removed
      diff.removed.push(oldEntry)
    }
  }

  return diff
}

/**
 * Detect if any migrations are needed.
 */
export function detectMigrations(
  oldManifest: DurableObjectManifest | null,
  newManifest: DurableObjectManifest
): DurableObjectMigration | null {
  const diff = detectMigrationDiff(oldManifest, newManifest)

  // Check if any changes require a migration
  const hasChanges =
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.renamed.length > 0 ||
    diff.sqliteChanged.length > 0

  if (!hasChanges) {
    return null
  }

  const migration: DurableObjectMigration = {
    tag: generateMigrationTag(),
  }

  // Add new classes
  const newSqliteClasses = diff.added.filter((e) => e.sqlite).map((e) => e.className)
  const newRegularClasses = diff.added.filter((e) => !e.sqlite).map((e) => e.className)

  if (newSqliteClasses.length > 0) {
    migration.new_sqlite_classes = newSqliteClasses
  }
  if (newRegularClasses.length > 0) {
    migration.new_classes = newRegularClasses
  }

  // Add renamed classes
  if (diff.renamed.length > 0) {
    migration.renamed_classes = diff.renamed.map(({ old: oldEntry, new: newEntry }) => ({
      from: oldEntry.className,
      to: newEntry.className,
    }))
  }

  // Add deleted classes
  if (diff.removed.length > 0) {
    migration.deleted_classes = diff.removed.map((e) => e.className)
  }

  // Handle SQLite changes (these are tricky - might need deletion and recreation)
  // For now, we treat SQLite changes as errors and don't auto-migrate
  // Users should manually handle these cases

  return migration
}

// ============================================================================
// Migration Tag Generation
// ============================================================================

/**
 * Generate a unique migration tag based on timestamp.
 * Format: v{YYYYMMDDHHMI}
 */
export function generateMigrationTag(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `v${year}${month}${day}${hour}${min}`
}

/**
 * Generate a simple incremental tag (v1, v2, etc.).
 */
export function generateIncrementalTag(existingTags: string[]): string {
  let maxVersion = 0

  for (const tag of existingTags) {
    const match = tag.match(/^v(\d+)$/)
    if (match) {
      const version = parseInt(match[1], 10)
      if (version > maxVersion) {
        maxVersion = version
      }
    }
  }

  return `v${maxVersion + 1}`
}

// ============================================================================
// Migration Serialization
// ============================================================================

/**
 * Convert a migration to TOML format.
 */
export function migrationToToml(migration: DurableObjectMigration): string {
  const lines: string[] = ['[[migrations]]', `tag = "${migration.tag}"`]

  if (migration.new_sqlite_classes && migration.new_sqlite_classes.length > 0) {
    const classList = migration.new_sqlite_classes.map((c) => `"${c}"`).join(', ')
    lines.push(`new_sqlite_classes = [${classList}]`)
  }

  if (migration.new_classes && migration.new_classes.length > 0) {
    const classList = migration.new_classes.map((c) => `"${c}"`).join(', ')
    lines.push(`new_classes = [${classList}]`)
  }

  if (migration.renamed_classes && migration.renamed_classes.length > 0) {
    lines.push('renamed_classes = [')
    for (const { from, to } of migration.renamed_classes) {
      lines.push(`  { from = "${from}", to = "${to}" },`)
    }
    lines.push(']')
  }

  if (migration.deleted_classes && migration.deleted_classes.length > 0) {
    const classList = migration.deleted_classes.map((c) => `"${c}"`).join(', ')
    lines.push(`deleted_classes = [${classList}]`)
  }

  return lines.join('\n')
}

/**
 * Append a new migration to existing migrations.
 */
export function appendMigration(
  existingMigrations: DurableObjectMigration[],
  newMigration: DurableObjectMigration
): DurableObjectMigration[] {
  return [...existingMigrations, newMigration]
}

// ============================================================================
// Migration Validation
// ============================================================================

/**
 * Validate a migration for potential issues.
 */
export function validateMigration(
  migration: DurableObjectMigration
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check tag format
  if (!migration.tag || migration.tag.length === 0) {
    errors.push('Migration tag is required')
  } else if (!/^v[a-zA-Z0-9]+$/.test(migration.tag)) {
    errors.push('Migration tag must start with "v" and contain only alphanumeric characters')
  }

  // Check for empty migration
  const hasContent =
    (migration.new_classes && migration.new_classes.length > 0) ||
    (migration.new_sqlite_classes && migration.new_sqlite_classes.length > 0) ||
    (migration.renamed_classes && migration.renamed_classes.length > 0) ||
    (migration.deleted_classes && migration.deleted_classes.length > 0)

  if (!hasContent) {
    warnings.push('Migration has no changes')
  }

  // Warn about deletions
  if (migration.deleted_classes && migration.deleted_classes.length > 0) {
    warnings.push(
      `Deleting ${migration.deleted_classes.length} class(es) will permanently remove their data`
    )
  }

  // Warn about renames
  if (migration.renamed_classes && migration.renamed_classes.length > 0) {
    warnings.push(
      `Renaming ${migration.renamed_classes.length} class(es) - ensure this is intentional`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// Manifest Persistence
// ============================================================================

/**
 * Serialize manifest for storage (e.g., in .cloudwerk/manifest.json).
 */
export function serializeManifest(manifest: DurableObjectManifest): string {
  return JSON.stringify(
    {
      durableObjects: manifest.durableObjects.map((entry) => ({
        name: entry.name,
        bindingName: entry.bindingName,
        className: entry.className,
        filePath: entry.filePath,
        sqlite: entry.sqlite,
        methodNames: entry.methodNames,
      })),
      generatedAt: manifest.generatedAt.toISOString(),
    },
    null,
    2
  )
}

/**
 * Deserialize manifest from storage.
 */
export function deserializeManifest(json: string): DurableObjectManifest | null {
  try {
    const data = JSON.parse(json)
    return {
      durableObjects: data.durableObjects.map(
        (entry: {
          name: string
          bindingName: string
          className: string
          filePath: string
          sqlite: boolean
          methodNames: string[]
        }) => ({
          name: entry.name,
          bindingName: entry.bindingName,
          className: entry.className,
          filePath: entry.filePath,
          absolutePath: '', // Not persisted
          generatedPath: '', // Not persisted
          sqlite: entry.sqlite,
          hasFetch: false, // Not persisted
          hasWebSocket: false, // Not persisted
          hasAlarm: false, // Not persisted
          methodNames: entry.methodNames,
        })
      ),
      errors: [],
      warnings: [],
      generatedAt: new Date(data.generatedAt),
      rootDir: '',
    }
  } catch {
    return null
  }
}
