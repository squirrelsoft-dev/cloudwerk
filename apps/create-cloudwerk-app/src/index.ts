#!/usr/bin/env node
/**
 * create-cloudwerk-app - Main Entry Point
 *
 * CLI for scaffolding new Cloudwerk projects.
 */

import { program } from 'commander'
import { createRequire } from 'node:module'
import { scaffold } from './scaffold.js'
import { logger } from './utils.js'
import { promptRenderer, isInteractiveMode, type RendererChoice } from './prompts.js'

// ============================================================================
// Version
// ============================================================================

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

// ============================================================================
// CLI Options
// ============================================================================

interface CLIOptions {
  renderer?: RendererChoice
}

// ============================================================================
// CLI Program
// ============================================================================

program
  .name('create-cloudwerk-app')
  .description('Create a new Cloudwerk app')
  .version(pkg.version)
  .argument('<project-name>', 'Name of the project to create')
  .option('-r, --renderer <type>', 'UI renderer (hono-jsx, react, none)', 'hono-jsx')
  .action(async (projectName: string, options: CLIOptions) => {
    try {
      let renderer = options.renderer as RendererChoice

      // Validate renderer option if provided
      const validRenderers: RendererChoice[] = ['hono-jsx', 'react', 'none']
      if (renderer && !validRenderers.includes(renderer)) {
        throw new Error(
          `Invalid renderer "${renderer}". Valid options: ${validRenderers.join(', ')}`
        )
      }

      // If interactive mode and no renderer specified via flag, prompt
      if (isInteractiveMode(process.argv)) {
        renderer = await promptRenderer()
      }

      await scaffold(projectName, { renderer })
    } catch (error) {
      logger.error((error as Error).message)
      process.exit(1)
    }
  })

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse()
