#!/usr/bin/env node
/**
 * @cloudwerk/cli - Main Entry Point
 *
 * CLI for Cloudwerk development and deployment.
 */

import { program } from 'commander'
import { dev } from './commands/dev.js'
import { build } from './commands/build.js'
import { deploy } from './commands/deploy.js'
import { configGet, configSet } from './commands/config.js'
import { bindings } from './commands/bindings.js'
import {
  bindingsAdd,
  bindingsRemove,
  bindingsUpdate,
  bindingsGenerateTypes,
} from './commands/bindings/index.js'
import { VERSION } from './version.js'
import { DEFAULT_PORT, DEFAULT_HOST } from './constants.js'

// ============================================================================
// CLI Program
// ============================================================================

program
  .name('cloudwerk')
  .description('Cloudwerk CLI - Build and deploy full-stack apps to Cloudflare')
  .version(VERSION)
  .enablePositionalOptions()

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
// Build Command
// ============================================================================

program
  .command('build [path]')
  .description('Build project for production deployment to Cloudflare Workers')
  .option('-o, --output <dir>', 'Output directory', './dist')
  .option('--ssg', 'Generate static pages for routes with rendering: static')
  .option('--minify', 'Minify bundles (default: true)')
  .option('--no-minify', 'Disable minification')
  .option('--sourcemap', 'Generate source maps')
  .option('-c, --config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .action(build)

// ============================================================================
// Deploy Command
// ============================================================================

program
  .command('deploy [path]')
  .description('Deploy to Cloudflare Workers')
  .option('-e, --env <environment>', 'Environment to deploy to')
  .option('--dry-run', 'Preview deployment without executing')
  .option('--skip-build', 'Skip the build step')
  .option('-c, --config <path>', 'Path to config file')
  .option('--verbose', 'Enable verbose logging')
  .action(deploy)

// ============================================================================
// Config Command
// ============================================================================

const configCmd = program
  .command('config')
  .description('Manage Cloudwerk configuration')

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action(configGet)

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(configSet)

// ============================================================================
// Bindings Command
// ============================================================================

const bindingsCmd = program
  .command('bindings')
  .description('Manage Cloudflare bindings (D1, KV, R2, Queues, etc.)')
  .enablePositionalOptions()
  .passThroughOptions()
  .option('--verbose', 'Enable verbose logging')
  .action(bindings)

bindingsCmd
  .command('add [type]')
  .description('Add a new binding (d1, kv, r2, queue, do, secret)')
  .option('-e, --env <environment>', 'Environment to add binding to')
  .option('--skip-types', 'Skip TypeScript type generation')
  .option('--verbose', 'Enable verbose logging')
  .action(bindingsAdd)

bindingsCmd
  .command('remove [name]')
  .description('Remove a binding')
  .option('-e, --env <environment>', 'Environment to remove binding from')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('--skip-types', 'Skip TypeScript type generation')
  .option('--verbose', 'Enable verbose logging')
  .action(bindingsRemove)

bindingsCmd
  .command('update [name]')
  .description('Update an existing binding')
  .option('-e, --env <environment>', 'Environment to update binding in')
  .option('--skip-types', 'Skip TypeScript type generation')
  .option('--verbose', 'Enable verbose logging')
  .action(bindingsUpdate)

bindingsCmd
  .command('generate-types')
  .description('Regenerate TypeScript type definitions')
  .option('--verbose', 'Enable verbose logging')
  .action(bindingsGenerateTypes)

// ============================================================================
// Parse Arguments
// ============================================================================

program.parse()
