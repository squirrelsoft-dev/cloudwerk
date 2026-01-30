/**
 * @cloudwerk/cli - Triggers Command
 *
 * Main entry point for the triggers command group.
 * Displays an overview of triggers when called without a subcommand.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanTriggers,
  buildTriggerManifest,
  getTriggerSummary,
} from '@cloudwerk/core/build'
import { createLogger } from '../utils/logger.js'
import { handleCommandError } from '../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface TriggersCommandOptions {
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Source Type Labels
// ============================================================================

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: (s: string) => string }> = {
  scheduled: { label: 'cron', color: pc.blue },
  queue: { label: 'queue', color: pc.green },
  r2: { label: 'R2', color: pc.yellow },
  webhook: { label: 'webhook', color: pc.magenta },
  email: { label: 'email', color: pc.cyan },
  d1: { label: 'D1', color: pc.red },
  tail: { label: 'tail', color: pc.gray },
}

/**
 * Format a source type for display.
 */
function formatSourceType(type: string): string {
  const config = SOURCE_TYPE_LABELS[type] || { label: type, color: pc.dim }
  return config.color(config.label)
}

// ============================================================================
// Triggers Command
// ============================================================================

/**
 * Display triggers overview and available subcommands.
 */
export async function triggers(options: TriggersCommandOptions = {}): Promise<void> {
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
    const summary = getTriggerSummary(manifest)

    console.log()
    console.log(pc.bold('Cloudwerk Triggers'))
    console.log()

    // Summary
    console.log(pc.dim(`  Found ${summary.total} triggers:`))
    if (summary.total > 0) {
      if (summary.scheduled > 0) {
        console.log(pc.dim(`    - ${summary.scheduled} scheduled (cron)`))
      }
      if (summary.queue > 0) {
        console.log(pc.dim(`    - ${summary.queue} queue consumers`))
      }
      if (summary.r2 > 0) {
        console.log(pc.dim(`    - ${summary.r2} R2 notifications`))
      }
      if (summary.webhook > 0) {
        console.log(pc.dim(`    - ${summary.webhook} webhooks`))
      }
      if (summary.email > 0) {
        console.log(pc.dim(`    - ${summary.email} email handlers`))
      }
    }
    console.log()

    // List triggers briefly
    if (manifest.triggers.length > 0) {
      for (const trigger of manifest.triggers) {
        const sourceType = formatSourceType(trigger.source?.type ?? 'unknown')
        const sourceInfo = getSourceInfo(trigger)
        console.log(
          `    ${pc.cyan(trigger.name)} ${pc.dim('(')}${sourceType}${sourceInfo ? pc.dim(': ') + pc.dim(sourceInfo) : ''}${pc.dim(')')}`
        )
      }
      console.log()
    }

    // Show warnings if any
    if (manifest.warnings.length > 0) {
      console.log(pc.yellow('Warnings:'))
      for (const warning of manifest.warnings) {
        console.log(pc.dim(`  - ${warning.file}: ${warning.message}`))
      }
      console.log()
    }

    // Available commands
    console.log(pc.bold('Commands:'))
    console.log()
    console.log(pc.dim('  cloudwerk triggers list        ') + 'List all triggers with details')
    console.log(pc.dim('  cloudwerk triggers validate    ') + 'Validate trigger configurations')
    console.log(pc.dim('  cloudwerk triggers generate    ') + 'Regenerate wrangler config')
    console.log()

    // Quick start hint
    if (manifest.triggers.length === 0) {
      console.log(pc.bold('Quick Start:'))
      console.log()
      console.log(pc.dim('  Create a scheduled trigger at app/triggers/daily-cleanup.ts:'))
      console.log()
      console.log(pc.cyan("    import { defineTrigger } from '@cloudwerk/trigger'"))
      console.log()
      console.log(pc.cyan('    export default defineTrigger({'))
      console.log(pc.cyan("      source: { type: 'scheduled', cron: '0 0 * * *' },"))
      console.log(pc.cyan('      async handle(event, ctx) {'))
      console.log(pc.cyan('        console.log(`[${ctx.traceId}] Running cleanup`)'))
      console.log(pc.cyan('        await cleanupOldRecords()'))
      console.log(pc.cyan('      }'))
      console.log(pc.cyan('    })'))
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}

/**
 * Get source-specific info for display.
 */
function getSourceInfo(trigger: { source?: unknown }): string {
  const source = trigger.source as Record<string, unknown> | undefined
  if (!source) return ''

  const type = source.type as string

  switch (type) {
    case 'scheduled':
      return String(source.cron ?? '')
    case 'queue':
      return String(source.queue ?? '')
    case 'r2':
      return String(source.bucket ?? '')
    case 'webhook':
      return String(source.path ?? '')
    case 'email':
      return String(source.address ?? '')
    default:
      return ''
  }
}
