/**
 * @cloudwerk/cli - Trigger wrangler.toml Generator
 *
 * Generates wrangler.toml trigger configurations (cron, queues, R2 notifications)
 * based on discovered trigger definitions in app/triggers/.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  TriggerEntry,
  TriggerManifest,
  ScheduledTriggerSource,
  QueueTriggerSource,
  R2TriggerSource,
} from '@cloudwerk/core/build'
import { readWranglerTomlRaw, writeWranglerTomlRaw, findWranglerToml } from './wrangler-toml.js'

// ============================================================================
// Types
// ============================================================================

export interface GenerateTriggerWranglerOptions {
  /** Dry run - don't actually write to file */
  dryRun?: boolean
  /** Include comments in generated TOML */
  includeComments?: boolean
}

export interface GenerateTriggerWranglerResult {
  /** Path to wrangler.toml */
  wranglerPath: string
  /** Whether any changes were made */
  changed: boolean
  /** Triggers added or updated */
  triggers: Array<{
    name: string
    sourceType: string
    bindingName: string
  }>
  /** Generated TOML snippet (for preview) */
  generatedToml: string
}

// ============================================================================
// TOML Generation
// ============================================================================

/**
 * Generate cron triggers TOML configuration.
 */
function generateCronToml(
  manifest: TriggerManifest,
  includeComments: boolean
): string {
  const cronTriggers = manifest.triggers.filter(
    (t) => t.source?.type === 'scheduled'
  )

  if (cronTriggers.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (includeComments) {
    lines.push('# Scheduled (Cron) Triggers')
  }
  lines.push('[triggers]')

  // Group triggers by cron expression
  const cronExpressions = new Set<string>()
  for (const trigger of cronTriggers) {
    const source = trigger.source as ScheduledTriggerSource
    cronExpressions.add(source.cron)
  }

  // Generate crons array
  const crons = Array.from(cronExpressions)
    .map((cron) => `"${cron}"`)
    .join(', ')
  lines.push(`crons = [${crons}]`)

  return lines.join('\n')
}

/**
 * Generate queue consumer TOML configuration for queue triggers.
 */
function generateQueueConsumerToml(
  manifest: TriggerManifest,
  includeComments: boolean
): string {
  const queueTriggers = manifest.triggers.filter(
    (t) => t.source?.type === 'queue'
  )

  if (queueTriggers.length === 0) {
    return ''
  }

  const lines: string[] = []

  for (const trigger of queueTriggers) {
    const source = trigger.source as QueueTriggerSource

    if (includeComments) {
      lines.push(`# Queue trigger '${trigger.name}' (from app/triggers/${trigger.filePath})`)
    }
    lines.push('[[queues.consumers]]')
    lines.push(`queue = "${source.queue}"`)

    // Add batch config if specified
    if (source.batch?.size !== undefined && source.batch.size !== 10) {
      lines.push(`max_batch_size = ${source.batch.size}`)
    }

    if (source.batch?.timeout !== undefined) {
      const timeoutSeconds = parseDurationToSeconds(source.batch.timeout)
      if (timeoutSeconds !== 5) {
        lines.push(`max_batch_timeout = ${timeoutSeconds}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Generate R2 bucket notification TOML configuration.
 */
function generateR2NotificationToml(
  manifest: TriggerManifest,
  includeComments: boolean
): string {
  const r2Triggers = manifest.triggers.filter(
    (t) => t.source?.type === 'r2'
  )

  if (r2Triggers.length === 0) {
    return ''
  }

  const lines: string[] = []

  // Group by bucket
  const bucketTriggers = new Map<string, TriggerEntry[]>()
  for (const trigger of r2Triggers) {
    const source = trigger.source as R2TriggerSource
    const existing = bucketTriggers.get(source.bucket) || []
    existing.push(trigger)
    bucketTriggers.set(source.bucket, existing)
  }

  for (const [bucket, triggers] of bucketTriggers) {
    if (includeComments) {
      const triggerNames = triggers.map((t) => t.name).join(', ')
      lines.push(`# R2 bucket notifications for '${bucket}' (triggers: ${triggerNames})`)
    }

    // Collect all event types for this bucket
    const eventTypes = new Set<string>()
    let prefix: string | undefined
    let suffix: string | undefined

    for (const trigger of triggers) {
      const source = trigger.source as R2TriggerSource
      for (const event of source.events) {
        eventTypes.add(event)
      }
      // Use first trigger's prefix/suffix
      if (!prefix && source.prefix) prefix = source.prefix
      if (!suffix && source.suffix) suffix = source.suffix
    }

    lines.push('[[r2_buckets]]')
    lines.push(`binding = "${bucket.toUpperCase()}_BUCKET"`)
    lines.push(`bucket_name = "${bucket}"`)

    // Add event notification configuration
    lines.push('')
    lines.push('[[r2_buckets.event_notifications.rules]]')

    if (prefix) {
      lines.push(`prefix = "${prefix}"`)
    }
    if (suffix) {
      lines.push(`suffix = "${suffix}"`)
    }

    // Convert event types to Cloudflare format
    const actions: string[] = []
    if (eventTypes.has('object-create')) {
      actions.push('"PutObject"', '"CopyObject"', '"CompleteMultipartUpload"')
    }
    if (eventTypes.has('object-delete')) {
      actions.push('"DeleteObject"')
    }

    if (actions.length > 0) {
      lines.push(`actions = [${actions.join(', ')}]`)
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Parse a duration string to seconds.
 */
function parseDurationToSeconds(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration
  }

  const match = duration.match(/^(\d+)(s|m|h)$/)
  if (!match) {
    return 5 // Default 5 seconds
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value
    case 'm':
      return value * 60
    case 'h':
      return value * 3600
    default:
      return 5
  }
}

/**
 * Generate complete trigger TOML section for all triggers.
 */
export function generateTriggerToml(
  manifest: TriggerManifest,
  includeComments: boolean = true
): string {
  if (manifest.triggers.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (includeComments) {
    lines.push('# ============================================================================')
    lines.push('# Cloudwerk Triggers - Auto-generated from app/triggers/')
    lines.push('# ============================================================================')
    lines.push('')
  }

  // Generate cron triggers
  const cronToml = generateCronToml(manifest, includeComments)
  if (cronToml) {
    lines.push(cronToml)
    lines.push('')
  }

  // Generate queue consumer triggers
  const queueToml = generateQueueConsumerToml(manifest, includeComments)
  if (queueToml) {
    lines.push(queueToml)
    lines.push('')
  }

  // Generate R2 notification triggers
  const r2Toml = generateR2NotificationToml(manifest, includeComments)
  if (r2Toml) {
    lines.push(r2Toml)
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ============================================================================
// File Operations
// ============================================================================

const TRIGGER_SECTION_START = '# ============================================================================'
const TRIGGER_SECTION_MARKER = '# Cloudwerk Triggers - Auto-generated'

/**
 * Check if wrangler.toml has an existing Cloudwerk trigger section.
 */
function hasTriggerSection(content: string): boolean {
  return content.includes(TRIGGER_SECTION_MARKER)
}

/**
 * Remove existing Cloudwerk trigger section from wrangler.toml content.
 */
function removeTriggerSection(content: string): string {
  // Find the start of the Cloudwerk trigger section
  const startIndex = content.indexOf(TRIGGER_SECTION_START)
  if (startIndex === -1 || !content.includes(TRIGGER_SECTION_MARKER)) {
    return content
  }

  // Find the line where Cloudwerk Triggers section starts
  const lines = content.split('\n')
  let sectionStartLine = -1
  let sectionEndLine = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(TRIGGER_SECTION_MARKER)) {
      // Find the separator line before the marker
      sectionStartLine = i > 0 && lines[i - 1].includes('===') ? i - 1 : i
      break
    }
  }

  if (sectionStartLine === -1) {
    return content
  }

  // Find the end - look for next section or end of file
  for (let i = sectionStartLine + 2; i < lines.length; i++) {
    const line = lines[i].trim()

    // Empty lines and comments are OK, continue
    if (line === '' || line.startsWith('#')) {
      continue
    }

    // If we hit a section that's not trigger-related, we've reached a new section
    if (line.startsWith('[[') || line.startsWith('[')) {
      // Check if this is part of our generated content
      if (
        line.includes('triggers') ||
        line.includes('queues.consumers') ||
        line.includes('r2_buckets')
      ) {
        continue
      }
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
 * Generate trigger wrangler.toml configuration and optionally write to file.
 */
export function generateTriggerWrangler(
  cwd: string,
  manifest: TriggerManifest,
  options: GenerateTriggerWranglerOptions = {}
): GenerateTriggerWranglerResult {
  const { dryRun = false, includeComments = true } = options

  const wranglerPath = findWranglerToml(cwd) || path.join(cwd, 'wrangler.toml')
  const generatedToml = generateTriggerToml(manifest, includeComments)

  const result: GenerateTriggerWranglerResult = {
    wranglerPath,
    changed: false,
    triggers: manifest.triggers.map((t) => ({
      name: t.name,
      sourceType: t.source?.type ?? 'unknown',
      bindingName: t.bindingName,
    })),
    generatedToml,
  }

  if (manifest.triggers.length === 0) {
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

  // Remove existing Cloudwerk trigger section if present
  if (hasTriggerSection(content)) {
    content = removeTriggerSection(content)
  }

  // Append new trigger configuration
  const newContent = content.trim() + '\n\n' + generatedToml + '\n'

  // Write the file
  writeWranglerTomlRaw(cwd, newContent)
  result.changed = true

  return result
}

/**
 * Remove Cloudwerk trigger configuration from wrangler.toml.
 */
export function removeTriggerWrangler(cwd: string): boolean {
  const wranglerPath = findWranglerToml(cwd)
  if (!wranglerPath) {
    return false
  }

  const content = readWranglerTomlRaw(cwd)
  if (!hasTriggerSection(content)) {
    return false
  }

  const newContent = removeTriggerSection(content)
  writeWranglerTomlRaw(cwd, newContent)
  return true
}
