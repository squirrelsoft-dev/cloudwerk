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

// ============================================================================
// Version
// ============================================================================

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

// ============================================================================
// CLI Program
// ============================================================================

program
  .name('create-cloudwerk-app')
  .description('Create a new Cloudwerk app')
  .version(pkg.version)
  .argument('<project-name>', 'Name of the project to create')
  .action(async (projectName: string) => {
    try {
      await scaffold(projectName)
    } catch (error) {
      logger.error((error as Error).message)
      process.exit(1)
    }
  })

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse()
