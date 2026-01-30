/**
 * @cloudwerk/cli - Triggers Validate Command
 *
 * Validate all trigger configurations.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanTriggers,
  buildTriggerManifest,
  hasTriggerErrors,
  hasTriggerWarnings,
} from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface TriggersValidateOptions {
  /** Exit with error code if warnings are present */
  strict?: boolean
  /** Show as JSON */
  json?: boolean
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Triggers Validate Command
// ============================================================================

/**
 * Validate all trigger configurations.
 */
export async function triggersValidate(options: TriggersValidateOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
  const strict = options.strict ?? false
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

    const hasErrors = hasTriggerErrors(manifest)
    const hasWarnings = hasTriggerWarnings(manifest)

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        valid: !hasErrors && (!strict || !hasWarnings),
        triggerCount: manifest.triggers.length,
        errors: manifest.errors,
        warnings: manifest.warnings,
      }, null, 2))

      if (hasErrors || (strict && hasWarnings)) {
        process.exit(1)
      }
      return
    }

    // Console output
    console.log()
    console.log(pc.bold('Validating Triggers'))
    console.log()

    if (manifest.triggers.length === 0) {
      console.log(pc.dim('  No triggers found to validate.'))
      console.log()
      return
    }

    // Show validation results for each trigger
    for (const trigger of manifest.triggers) {
      const triggerErrors = manifest.errors.filter((e) =>
        e.file === trigger.filePath
      )
      const triggerWarnings = manifest.warnings.filter((w) =>
        w.file === trigger.filePath
      )

      if (triggerErrors.length > 0) {
        console.log(`  ${pc.red('✗')} ${pc.cyan(trigger.name)} ${pc.dim(`(${trigger.filePath})`)}`)
        for (const error of triggerErrors) {
          console.log(`      ${pc.red('error:')} ${error.message}`)
        }
      } else if (triggerWarnings.length > 0) {
        console.log(`  ${pc.yellow('!')} ${pc.cyan(trigger.name)} ${pc.dim(`(${trigger.filePath})`)}`)
        for (const warning of triggerWarnings) {
          console.log(`      ${pc.yellow('warning:')} ${warning.message}`)
        }
      } else {
        console.log(`  ${pc.green('✓')} ${pc.cyan(trigger.name)} ${pc.dim('- valid')}`)
      }
    }

    console.log()

    // Summary
    const errorCount = manifest.errors.length
    const warningCount = manifest.warnings.length

    if (hasErrors) {
      console.log(pc.red(`  ${errorCount} error(s), ${warningCount} warning(s)`))
      console.log()
      process.exit(1)
    } else if (hasWarnings) {
      console.log(pc.yellow(`  ${warningCount} warning(s)`))
      console.log()
      if (strict) {
        process.exit(1)
      }
    } else {
      console.log(pc.green(`  All ${manifest.triggers.length} trigger(s) valid`))
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
