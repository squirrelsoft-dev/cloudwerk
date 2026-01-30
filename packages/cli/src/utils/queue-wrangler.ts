/**
 * @cloudwerk/cli - Queue wrangler.toml Generator
 *
 * Generates wrangler.toml queue producer and consumer configurations
 * based on discovered queue definitions in app/queues/.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { QueueEntry, QueueManifest, QueueProcessingConfig } from '@cloudwerk/core/build'
import { readWranglerTomlRaw, writeWranglerTomlRaw, findWranglerToml } from './wrangler-toml.js'

// ============================================================================
// Types
// ============================================================================

export interface GenerateQueueWranglerOptions {
  /** Dry run - don't actually write to file */
  dryRun?: boolean
  /** Include comments in generated TOML */
  includeComments?: boolean
}

export interface GenerateQueueWranglerResult {
  /** Path to wrangler.toml */
  wranglerPath: string
  /** Whether any changes were made */
  changed: boolean
  /** Queues added or updated */
  queues: Array<{ name: string; queueName: string; bindingName: string }>
  /** Generated TOML snippet (for preview) */
  generatedToml: string
}

// ============================================================================
// TOML Generation
// ============================================================================

/**
 * Parse a duration string to seconds for wrangler.toml.
 */
function parseDurationToSeconds(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration
  }

  const match = duration.match(/^(\d+)(s|m|h)$/)
  if (!match) {
    return 60 // Default 1 minute
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
      return 60
  }
}

/**
 * Generate queue producer TOML configuration.
 */
function generateProducerToml(queue: QueueEntry, includeComments: boolean): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`# Queue producer for '${queue.name}' (from app/queues/${queue.filePath})`)
  }
  lines.push('[[queues.producers]]')
  lines.push(`binding = "${queue.bindingName}"`)
  lines.push(`queue = "${queue.queueName}"`)

  return lines.join('\n')
}

/**
 * Generate queue consumer TOML configuration.
 */
function generateConsumerToml(
  queue: QueueEntry,
  config: QueueProcessingConfig,
  includeComments: boolean
): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`# Queue consumer for '${queue.name}'`)
  }
  lines.push('[[queues.consumers]]')
  lines.push(`queue = "${queue.queueName}"`)

  // Add config options if not default
  if (config.batchSize !== undefined && config.batchSize !== 10) {
    lines.push(`max_batch_size = ${config.batchSize}`)
  }

  if (config.maxRetries !== undefined && config.maxRetries !== 3) {
    lines.push(`max_retries = ${config.maxRetries}`)
  }

  if (config.batchTimeout !== undefined) {
    const timeoutSeconds = parseDurationToSeconds(config.batchTimeout)
    if (timeoutSeconds !== 5) {
      lines.push(`max_batch_timeout = ${timeoutSeconds}`)
    }
  }

  if (config.deadLetterQueue) {
    lines.push(`dead_letter_queue = "${config.deadLetterQueue}"`)
  }

  return lines.join('\n')
}

/**
 * Generate complete queue TOML section for all queues.
 */
export function generateQueueToml(
  manifest: QueueManifest,
  includeComments: boolean = true
): string {
  if (manifest.queues.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (includeComments) {
    lines.push('# ============================================================================')
    lines.push('# Cloudwerk Queues - Auto-generated from app/queues/')
    lines.push('# ============================================================================')
    lines.push('')
  }

  // Generate producers
  for (const queue of manifest.queues) {
    lines.push(generateProducerToml(queue, includeComments))
    lines.push('')
  }

  // Generate consumers
  for (const queue of manifest.queues) {
    lines.push(generateConsumerToml(queue, queue.config, includeComments))
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ============================================================================
// File Operations
// ============================================================================

const QUEUE_SECTION_START = '# ============================================================================'
const QUEUE_SECTION_MARKER = '# Cloudwerk Queues - Auto-generated'

/**
 * Check if wrangler.toml has an existing Cloudwerk queue section.
 */
function hasQueueSection(content: string): boolean {
  return content.includes(QUEUE_SECTION_MARKER)
}

/**
 * Remove existing Cloudwerk queue section from wrangler.toml content.
 */
function removeQueueSection(content: string): string {
  // Find the start of the Cloudwerk queue section
  const startIndex = content.indexOf(QUEUE_SECTION_START)
  if (startIndex === -1 || !content.includes(QUEUE_SECTION_MARKER)) {
    return content
  }

  // Find the line where Cloudwerk Queues section starts
  const lines = content.split('\n')
  let sectionStartLine = -1
  let sectionEndLine = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(QUEUE_SECTION_MARKER)) {
      // Find the separator line before the marker
      sectionStartLine = i > 0 && lines[i - 1].includes('===') ? i - 1 : i
      break
    }
  }

  if (sectionStartLine === -1) {
    return content
  }

  // Find the end - look for next section or end of file
  // The queue section ends when we hit a line that:
  // 1. Starts a new section (contains '=' but not in queue context)
  // 2. Has a different separator comment
  for (let i = sectionStartLine + 2; i < lines.length; i++) {
    const line = lines[i].trim()

    // Empty lines are OK, continue
    if (line === '' || line.startsWith('#')) {
      continue
    }

    // If we hit [[something]] that's not queues, we've reached a new section
    if (line.startsWith('[[') && !line.includes('queues')) {
      sectionEndLine = i
      break
    }

    // If we hit [something] (single bracket) that's not queues-related
    if (
      line.startsWith('[') &&
      !line.startsWith('[[') &&
      !line.includes('queues')
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
 * Generate queue wrangler.toml configuration and optionally write to file.
 */
export function generateQueueWrangler(
  cwd: string,
  manifest: QueueManifest,
  options: GenerateQueueWranglerOptions = {}
): GenerateQueueWranglerResult {
  const { dryRun = false, includeComments = true } = options

  const wranglerPath = findWranglerToml(cwd) || path.join(cwd, 'wrangler.toml')
  const generatedToml = generateQueueToml(manifest, includeComments)

  const result: GenerateQueueWranglerResult = {
    wranglerPath,
    changed: false,
    queues: manifest.queues.map((q) => ({
      name: q.name,
      queueName: q.queueName,
      bindingName: q.bindingName,
    })),
    generatedToml,
  }

  if (manifest.queues.length === 0) {
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

  // Remove existing Cloudwerk queue section if present
  if (hasQueueSection(content)) {
    content = removeQueueSection(content)
  }

  // Append new queue configuration
  const newContent = content.trim() + '\n\n' + generatedToml + '\n'

  // Write the file
  writeWranglerTomlRaw(cwd, newContent)
  result.changed = true

  return result
}

/**
 * Remove Cloudwerk queue configuration from wrangler.toml.
 */
export function removeQueueWrangler(cwd: string): boolean {
  const wranglerPath = findWranglerToml(cwd)
  if (!wranglerPath) {
    return false
  }

  const content = readWranglerTomlRaw(cwd)
  if (!hasQueueSection(content)) {
    return false
  }

  const newContent = removeQueueSection(content)
  writeWranglerTomlRaw(cwd, newContent)
  return true
}
