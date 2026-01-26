#!/usr/bin/env node
/**
 * @cloudwerk/cli - Main Entry Point
 *
 * CLI for Cloudwerk development and deployment.
 */

import { program } from 'commander'
import { dev } from './commands/dev.js'
import { VERSION } from './version.js'
import { DEFAULT_PORT, DEFAULT_HOST } from './constants.js'

// ============================================================================
// CLI Program
// ============================================================================

program
  .name('cloudwerk')
  .description('Cloudwerk CLI - Build and deploy full-stack apps to Cloudflare')
  .version(VERSION)

// ============================================================================
// Dev Command
// ============================================================================

program
  .command('dev [path]')
  .description('Start development server')
  .option('-p, --port <number>', 'Port to listen on', String(DEFAULT_PORT))
  .option('-H, --host <host>', 'Host to bind', DEFAULT_HOST)
  .option('-c, --config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .action(dev)

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse()
