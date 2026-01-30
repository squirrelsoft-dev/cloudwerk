/**
 * @cloudwerk/cli - Durable Object wrangler.toml Generator
 *
 * Generates wrangler.toml durable object bindings and migrations
 * based on discovered durable object definitions in app/objects/.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { DurableObjectEntry, DurableObjectManifest } from '@cloudwerk/core/build'
import { readWranglerTomlRaw, writeWranglerTomlRaw, findWranglerToml } from './wrangler-toml.js'

// ============================================================================
// Types
// ============================================================================

export interface GenerateDurableObjectWranglerOptions {
  /** Dry run - don't actually write to file */
  dryRun?: boolean
  /** Include comments in generated TOML */
  includeComments?: boolean
  /** Migration tag for new classes (auto-generated if not provided) */
  migrationTag?: string
}

export interface GenerateDurableObjectWranglerResult {
  /** Path to wrangler.toml */
  wranglerPath: string
  /** Whether any changes were made */
  changed: boolean
  /** Durable objects added or updated */
  durableObjects: Array<{ name: string; bindingName: string; className: string }>
  /** Generated TOML snippet (for preview) */
  generatedToml: string
}

export interface DurableObjectMigration {
  tag: string
  new_classes?: string[]
  new_sqlite_classes?: string[]
  renamed_classes?: Array<{ from: string; to: string }>
  deleted_classes?: string[]
}

// ============================================================================
// TOML Generation
// ============================================================================

/**
 * Generate durable object bindings TOML.
 */
function generateBindingsToml(
  entries: DurableObjectEntry[],
  includeComments: boolean
): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push('# Durable object bindings')
  }
  lines.push('[durable_objects]')
  lines.push('bindings = [')

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const comma = i < entries.length - 1 ? ',' : ''
    if (includeComments) {
      lines.push(`  # ${entry.name} (from app/objects/${entry.filePath})`)
    }
    lines.push(`  { name = "${entry.bindingName}", class_name = "${entry.className}" }${comma}`)
  }

  lines.push(']')

  return lines.join('\n')
}

/**
 * Generate durable object migration TOML.
 */
function generateMigrationToml(
  entries: DurableObjectEntry[],
  migrationTag: string,
  includeComments: boolean
): string {
  const sqliteClasses = entries.filter((e) => e.sqlite).map((e) => e.className)
  const regularClasses = entries.filter((e) => !e.sqlite).map((e) => e.className)

  if (sqliteClasses.length === 0 && regularClasses.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (includeComments) {
    lines.push('# Durable object migrations')
  }
  lines.push('[[migrations]]')
  lines.push(`tag = "${migrationTag}"`)

  if (sqliteClasses.length > 0) {
    const classList = sqliteClasses.map((c) => `"${c}"`).join(', ')
    lines.push(`new_sqlite_classes = [${classList}]`)
  }

  if (regularClasses.length > 0) {
    const classList = regularClasses.map((c) => `"${c}"`).join(', ')
    lines.push(`new_classes = [${classList}]`)
  }

  return lines.join('\n')
}

/**
 * Generate complete durable object TOML section.
 */
export function generateDurableObjectToml(
  manifest: DurableObjectManifest,
  includeComments: boolean = true,
  migrationTag?: string
): string {
  if (manifest.durableObjects.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (includeComments) {
    lines.push('# ============================================================================')
    lines.push('# Cloudwerk Durable Objects - Auto-generated from app/objects/')
    lines.push('# ============================================================================')
    lines.push('')
  }

  // Generate bindings
  lines.push(generateBindingsToml(manifest.durableObjects, includeComments))
  lines.push('')

  // Generate migrations (only if we have classes)
  const tag = migrationTag || generateMigrationTag()
  const migrationToml = generateMigrationToml(manifest.durableObjects, tag, includeComments)
  if (migrationToml) {
    lines.push(migrationToml)
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ============================================================================
// Migration Tag Generation
// ============================================================================

/**
 * Generate a unique migration tag based on timestamp.
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
 * Extract existing migration tags from wrangler.toml content.
 */
export function extractExistingMigrationTags(content: string): string[] {
  const tags: string[] = []
  const regex = /^\s*tag\s*=\s*"([^"]+)"/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1])
  }
  return tags
}

// ============================================================================
// File Operations
// ============================================================================

const DO_SECTION_START = '# ============================================================================'
const DO_SECTION_MARKER = '# Cloudwerk Durable Objects - Auto-generated'

/**
 * Check if wrangler.toml has an existing Cloudwerk durable objects section.
 */
function hasDurableObjectSection(content: string): boolean {
  return content.includes(DO_SECTION_MARKER)
}

/**
 * Remove existing Cloudwerk durable objects section from wrangler.toml content.
 */
function removeDurableObjectSection(content: string): string {
  // Find the start of the Cloudwerk durable objects section
  const startIndex = content.indexOf(DO_SECTION_START)
  if (startIndex === -1 || !content.includes(DO_SECTION_MARKER)) {
    return content
  }

  // Find the line where Cloudwerk Durable Objects section starts
  const lines = content.split('\n')
  let sectionStartLine = -1
  let sectionEndLine = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(DO_SECTION_MARKER)) {
      // Find the separator line before the marker
      sectionStartLine = i > 0 && lines[i - 1].includes('===') ? i - 1 : i
      break
    }
  }

  if (sectionStartLine === -1) {
    return content
  }

  // Find the end - look for next section or end of file
  // The DO section ends when we hit a line that:
  // 1. Starts a new section (contains '=' but not in DO context)
  // 2. Has a different separator comment
  for (let i = sectionStartLine + 2; i < lines.length; i++) {
    const line = lines[i].trim()

    // Empty lines are OK, continue
    if (line === '' || line.startsWith('#')) {
      continue
    }

    // If we hit [[something]] that's not durable_objects or migrations, new section
    if (
      line.startsWith('[[') &&
      !line.includes('durable_objects') &&
      !line.includes('migrations')
    ) {
      sectionEndLine = i
      break
    }

    // If we hit [something] (single bracket) that's not durable_objects
    if (
      line.startsWith('[') &&
      !line.startsWith('[[') &&
      !line.includes('durable_objects')
    ) {
      sectionEndLine = i
      break
    }
  }

  // Remove the section
  const before = lines.slice(0, sectionStartLine)
  const after = lines.slice(sectionEndLine)

  // Clean up extra blank lines
  while (before.length > 0 && before[before.length - 1].trim() === '') {
    before.pop()
  }

  return [...before, '', ...after].join('\n')
}

/**
 * Generate durable object wrangler.toml configuration and optionally write to file.
 */
export function generateDurableObjectWrangler(
  cwd: string,
  manifest: DurableObjectManifest,
  options: GenerateDurableObjectWranglerOptions = {}
): GenerateDurableObjectWranglerResult {
  const { dryRun = false, includeComments = true, migrationTag } = options

  const wranglerPath = findWranglerToml(cwd) || path.join(cwd, 'wrangler.toml')
  const generatedToml = generateDurableObjectToml(manifest, includeComments, migrationTag)

  const result: GenerateDurableObjectWranglerResult = {
    wranglerPath,
    changed: false,
    durableObjects: manifest.durableObjects.map((obj) => ({
      name: obj.name,
      bindingName: obj.bindingName,
      className: obj.className,
    })),
    generatedToml,
  }

  if (manifest.durableObjects.length === 0) {
    return result
  }

  if (dryRun) {
    result.changed = true
    return result
  }

  // Read existing content
  let content = ''
  if (fs.existsSync(wranglerPath)) {
    content = readWranglerTomlRaw(cwd)
  }

  // Remove existing Cloudwerk durable objects section if present
  if (hasDurableObjectSection(content)) {
    content = removeDurableObjectSection(content)
  }

  // Append new durable object configuration
  const newContent = content.trim() + '\n\n' + generatedToml + '\n'

  // Write the file
  writeWranglerTomlRaw(cwd, newContent)
  result.changed = true

  return result
}

/**
 * Remove Cloudwerk durable object configuration from wrangler.toml.
 */
export function removeDurableObjectWrangler(cwd: string): boolean {
  const wranglerPath = findWranglerToml(cwd)
  if (!wranglerPath) {
    return false
  }

  const content = readWranglerTomlRaw(cwd)
  if (!hasDurableObjectSection(content)) {
    return false
  }

  const newContent = removeDurableObjectSection(content)
  writeWranglerTomlRaw(cwd, newContent)
  return true
}
