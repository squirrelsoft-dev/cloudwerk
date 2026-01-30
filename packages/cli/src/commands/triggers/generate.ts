/**
 * @cloudwerk/cli - Triggers Generate Command
 *
 * Regenerate wrangler.toml trigger configurations and TypeScript types.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanTriggers,
  buildTriggerManifest,
} from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { generateTriggerWrangler } from '../../utils/trigger-wrangler.js'
import { generateTriggerTypes } from '../../utils/trigger-type-generator.js'

// ============================================================================
// Types
// ============================================================================

export interface TriggersGenerateOptions {
  /** Only generate wrangler.toml config */
  wrangler?: boolean
  /** Only generate TypeScript types */
  types?: boolean
  /** Dry run - show what would be generated */
  dryRun?: boolean
  /** Show as JSON */
  json?: boolean
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Triggers Generate Command
// ============================================================================

/**
 * Regenerate wrangler.toml trigger configurations and TypeScript types.
 */
export async function triggersGenerate(options: TriggersGenerateOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
  const dryRun = options.dryRun ?? false
  const logger = createLogger(verbose)

  // Default to generating both if neither specified
  const generateWrangler = options.wrangler ?? (!options.types)
  const generateTypes = options.types ?? (!options.wrangler)

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

    // JSON output
    if (options.json) {
      const result: Record<string, unknown> = {
        triggerCount: manifest.triggers.length,
        dryRun,
      }

      if (generateWrangler) {
        const wranglerResult = generateTriggerWrangler(cwd, manifest, { dryRun })
        result.wrangler = {
          path: wranglerResult.wranglerPath,
          changed: wranglerResult.changed,
          triggers: wranglerResult.triggers,
          generatedToml: dryRun ? wranglerResult.generatedToml : undefined,
        }
      }

      if (generateTypes) {
        const typesResult = generateTriggerTypes(cwd, manifest, { includeTimestamp: !dryRun })
        result.types = {
          path: typesResult.file,
          triggerCount: typesResult.triggerCount,
          triggers: typesResult.triggers,
        }
      }

      console.log(JSON.stringify(result, null, 2))
      return
    }

    // Console output
    console.log()
    console.log(pc.bold('Generating Trigger Configuration'))
    console.log()

    if (manifest.triggers.length === 0) {
      console.log(pc.dim('  No triggers found. Nothing to generate.'))
      console.log()
      return
    }

    console.log(pc.dim(`  Found ${manifest.triggers.length} trigger(s)`))
    console.log()

    // Generate wrangler.toml
    if (generateWrangler) {
      const wranglerResult = generateTriggerWrangler(cwd, manifest, {
        dryRun,
        includeComments: true,
      })

      if (dryRun) {
        console.log(pc.cyan('  wrangler.toml (dry run):'))
        console.log()
        // Indent each line
        const lines = wranglerResult.generatedToml.split('\n')
        for (const line of lines) {
          console.log(`    ${line}`)
        }
        console.log()
      } else {
        console.log(`  ${pc.green('✓')} Updated ${pc.dim(wranglerResult.wranglerPath)}`)
        for (const trigger of wranglerResult.triggers) {
          console.log(pc.dim(`      - ${trigger.name} (${trigger.sourceType})`))
        }
      }
    }

    // Generate TypeScript types
    if (generateTypes) {
      if (!dryRun) {
        const typesResult = generateTriggerTypes(cwd, manifest, { includeTimestamp: true })
        console.log(`  ${pc.green('✓')} Generated ${pc.dim(typesResult.file)}`)
        console.log(pc.dim(`      - ${typesResult.triggerCount} trigger type(s)`))
      } else {
        console.log(pc.cyan('  TypeScript types (dry run):'))
        console.log(pc.dim(`      Would generate .cloudwerk/types/triggers.d.ts`))
      }
    }

    console.log()

    // Hints
    if (!dryRun && generateTypes) {
      console.log(pc.dim('  Tip: Add ".cloudwerk/types" to your tsconfig.json include array'))
      console.log()
    }

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
