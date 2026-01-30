/**
 * @cloudwerk/cli - Triggers List Command
 *
 * List all discovered triggers with their details.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanTriggers,
  buildTriggerManifest,
  type TriggerEntry,
  type ScheduledTriggerSource,
  type QueueTriggerSource,
  type R2TriggerSource,
  type WebhookTriggerSource,
  type EmailTriggerSource,
} from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface TriggersListOptions {
  /** Filter by source type */
  type?: string
  /** Show as JSON */
  json?: boolean
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Source Type Labels
// ============================================================================

const SOURCE_TYPE_COLORS: Record<string, (s: string) => string> = {
  scheduled: pc.blue,
  queue: pc.green,
  r2: pc.yellow,
  webhook: pc.magenta,
  email: pc.cyan,
  d1: pc.red,
  tail: pc.gray,
}

// ============================================================================
// Triggers List Command
// ============================================================================

/**
 * List all triggers with detailed information.
 */
export async function triggersList(options: TriggersListOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)

  try {
    const cwd = process.cwd()

    // Load config
    logger.debug('Loading configuration...')
    const config = await loadConfig(cwd)
    const appDir = config.appDir

    // Scan for triggers
    logger.debug(`Scanning for triggers in ${appDir}/triggers/...`)
    const scanResult = await scanTriggers(appDir, {
      extensions: config.extensions,
    })

    // Build manifest
    const manifest = buildTriggerManifest(scanResult, appDir)

    // Filter by type if specified
    let triggers = manifest.triggers
    if (options.type) {
      triggers = triggers.filter((t) => t.source?.type === options.type)
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        triggers: triggers.map(formatTriggerJson),
        count: triggers.length,
        errors: manifest.errors,
        warnings: manifest.warnings,
      }, null, 2))
      return
    }

    // Table output
    console.log()
    console.log(pc.bold('Triggers'))
    console.log()

    if (triggers.length === 0) {
      if (options.type) {
        console.log(pc.dim(`  No triggers of type '${options.type}' found.`))
      } else {
        console.log(pc.dim('  No triggers found.'))
      }
      console.log()
      return
    }

    // Print table header
    console.log(
      `  ${pc.dim('NAME'.padEnd(25))} ${pc.dim('TYPE'.padEnd(12))} ${pc.dim('SOURCE'.padEnd(30))} ${pc.dim('ERROR HANDLER')}`
    )
    console.log(pc.dim('  ' + '-'.repeat(80)))

    for (const trigger of triggers) {
      const color = SOURCE_TYPE_COLORS[trigger.source?.type ?? 'unknown'] ?? pc.dim
      const sourceType = trigger.source?.type ?? 'unknown'
      const sourceInfo = getSourceInfo(trigger)
      const hasError = trigger.hasOnError ? pc.green('yes') : pc.dim('no')

      console.log(
        `  ${pc.cyan(trigger.name.padEnd(25))} ${color(sourceType.padEnd(12))} ${pc.dim(sourceInfo.padEnd(30))} ${hasError}`
      )
    }

    console.log()
    console.log(pc.dim(`  ${triggers.length} trigger(s)`))
    console.log()

    // Show errors
    if (manifest.errors.length > 0) {
      console.log(pc.red('Errors:'))
      for (const error of manifest.errors) {
        console.log(pc.dim(`  - ${error.file}: ${error.message}`))
      }
      console.log()
    }

    // Show warnings
    if (manifest.warnings.length > 0) {
      console.log(pc.yellow('Warnings:'))
      for (const warning of manifest.warnings) {
        console.log(pc.dim(`  - ${warning.file}: ${warning.message}`))
      }
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}

/**
 * Get source-specific info for display.
 */
function getSourceInfo(trigger: TriggerEntry): string {
  const source = trigger.source
  if (!source) return 'unknown'

  switch (source.type) {
    case 'scheduled':
      return (source as ScheduledTriggerSource).cron
    case 'queue':
      return (source as QueueTriggerSource).queue
    case 'r2': {
      const r2 = source as R2TriggerSource
      return `${r2.bucket} (${r2.events.join(', ')})`
    }
    case 'webhook':
      return (source as WebhookTriggerSource).path
    case 'email':
      return (source as EmailTriggerSource).address
    default:
      return source.type
  }
}

/**
 * Format trigger for JSON output.
 */
function formatTriggerJson(trigger: TriggerEntry): Record<string, unknown> {
  return {
    name: trigger.name,
    bindingName: trigger.bindingName,
    filePath: trigger.filePath,
    sourceType: trigger.source?.type,
    source: trigger.source,
    hasOnError: trigger.hasOnError,
    retry: trigger.retry,
    timeout: trigger.timeout,
    fanOutGroup: trigger.fanOutGroup,
  }
}
