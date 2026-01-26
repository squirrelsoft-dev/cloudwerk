#!/usr/bin/env node
/**
 * @cloudwerk/cli - Main Entry Point
 *
 * CLI for Cloudwerk development and deployment.
 */

import { program } from 'commander'
import { dev } from './commands/dev.js'

// ============================================================================
// CLI Program
// ============================================================================

program
  .name('cloudwerk')
  .description('Cloudwerk CLI - Build and deploy full-stack apps to Cloudflare')
  .version('0.0.1')

// ============================================================================
// Dev Command
// ============================================================================

program
  .command('dev [path]')
  .description('Start development server')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('-H, --host <host>', 'Host to bind', 'localhost')
  .option('-c, --config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .action(dev)

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse()
