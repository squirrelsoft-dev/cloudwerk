/**
 * @cloudwerk/cli - Bindings Add Command
 *
 * Add new Cloudflare bindings to wrangler.toml.
 */

import { spawn } from 'node:child_process'
import pc from 'picocolors'
import { select, input, confirm } from '@inquirer/prompts'

import type { BindingsAddCommandOptions } from '../../types.js'
import { CliError } from '../../types.js'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import {
  findWranglerToml,
  readWranglerToml,
  bindingExists,
  addD1Binding,
  addKVBinding,
  addR2Binding,
  addQueueBinding,
  addDurableObjectBinding,
  addSecretBinding,
  extractBindings,
  setAccountId,
  type BindingType,
} from '../../utils/wrangler-toml.js'
import { generateEnvTypes, getTypeForBinding } from '../../utils/env-types.js'

// ============================================================================
// Types
// ============================================================================

interface WranglerD1Database {
  uuid: string
  name: string
  created_at: string
}

interface WranglerKVNamespace {
  id: string
  title: string
}

interface WranglerR2Bucket {
  name: string
  creation_date: string
}

interface WranglerQueue {
  queue_id: string
  queue_name: string
  created_on: string
}

interface CloudflareAccount {
  name: string
  id: string
}

// ============================================================================
// Add Binding Command
// ============================================================================

/**
 * Add a new binding to wrangler.toml.
 *
 * @param bindingType - Optional binding type (d1, kv, r2, queue, do, secret)
 * @param options - Command options
 */
export async function bindingsAdd(
  bindingType: string | undefined,
  options: BindingsAddCommandOptions
): Promise<void> {
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)
  const env = options.env

  try {
    const cwd = process.cwd()

    // Check for wrangler.toml
    const wranglerPath = findWranglerToml(cwd)
    if (!wranglerPath) {
      throw new CliError(
        'wrangler.toml not found',
        'ENOENT',
        'Create a wrangler.toml file or run this command from a Cloudwerk project directory.'
      )
    }

    logger.debug(`Found wrangler config: ${wranglerPath}`)

    // If no binding type specified, prompt for one
    const type = bindingType || (await promptForBindingType())

    const envLabel = env ? ` (${env})` : ''
    console.log()
    logger.info(`Adding ${type.toUpperCase()} binding${envLabel}...`)

    // Dispatch to the appropriate handler
    switch (type.toLowerCase()) {
      case 'd1':
        await addD1(cwd, options)
        break
      case 'kv':
        await addKV(cwd, options)
        break
      case 'r2':
        await addR2(cwd, options)
        break
      case 'queue':
        await addQueue(cwd, options)
        break
      case 'do':
        await addDurableObject(cwd, options)
        break
      case 'secret':
        await addSecret(cwd, options)
        break
      default:
        throw new CliError(
          `Unknown binding type: ${type}`,
          'EINVAL',
          'Valid types are: d1, kv, r2, queue, do, secret'
        )
    }

    // Generate TypeScript types
    if (!options.skipTypes) {
      await regenerateTypes(cwd)
    }

    console.log()
    logger.success('Binding added successfully!')
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}

// ============================================================================
// Binding Type Prompts
// ============================================================================

async function promptForBindingType(): Promise<string> {
  return select({
    message: 'What type of binding do you want to add?',
    choices: [
      { name: 'D1 Database', value: 'd1' },
      { name: 'KV Namespace', value: 'kv' },
      { name: 'R2 Bucket', value: 'r2' },
      { name: 'Queue', value: 'queue' },
      { name: 'Durable Object', value: 'do' },
      { name: 'Secret / Environment Variable', value: 'secret' },
    ],
  })
}

// ============================================================================
// D1 Database
// ============================================================================

async function addD1(
  cwd: string,
  options: BindingsAddCommandOptions
): Promise<void> {
  const config = readWranglerToml(cwd)
  const env = options.env

  // Prompt for binding name
  const bindingName = await input({
    message: 'Binding name (e.g., DB):',
    validate: (value) => {
      if (!value.trim()) return 'Binding name is required'
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(value))
        return 'Binding name must be alphanumeric with underscores'
      if (bindingExists(config, value, env))
        return `Binding "${value}" already exists`
      return true
    },
  })

  // Prompt for database name
  const databaseName = await input({
    message: 'Database name:',
    default: `${config.name || 'my-app'}${env ? `-${env}` : ''}-db`,
    validate: (value) => {
      if (!value.trim()) return 'Database name is required'
      return true
    },
  })

  // Ask whether to create new or use existing
  const createNew = await confirm({
    message: 'Create a new D1 database?',
    default: true,
  })

  let databaseId: string

  if (createNew) {
    // Create new database
    console.log()
    console.log(pc.dim(`Creating D1 database "${databaseName}"...`))

    const result = await runWranglerCommand(['d1', 'create', databaseName])
    const idMatch = result.match(/database_id\s*=\s*"([^"]+)"/)

    if (!idMatch) {
      throw new CliError(
        'Failed to parse database ID from wrangler output',
        'EPARSE',
        'Try creating the database manually with: wrangler d1 create ' +
          databaseName
      )
    }

    databaseId = idMatch[1]
    console.log(pc.green('\u2713') + ` Created database: ${databaseId}`)
  } else {
    // List existing databases
    const databases = await listD1Databases()

    if (databases.length === 0) {
      throw new CliError(
        'No D1 databases found',
        'ENOENT',
        'Create a database first with: wrangler d1 create <name>'
      )
    }

    const selected = await select({
      message: 'Select an existing database:',
      choices: databases.map((db) => ({
        name: `${db.name} (${db.uuid.slice(0, 8)}...)`,
        value: db.uuid,
      })),
    })

    databaseId = selected
  }

  // Add to wrangler.toml
  addD1Binding(cwd, bindingName, databaseName, databaseId, env)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')

  // Show type hint
  showTypeHint(bindingName, 'd1')
}

async function listD1Databases(): Promise<WranglerD1Database[]> {
  const output = await runWranglerCommand(['d1', 'list', '--json'])
  return JSON.parse(output) as WranglerD1Database[]
}

// ============================================================================
// KV Namespace
// ============================================================================

async function addKV(
  cwd: string,
  options: BindingsAddCommandOptions
): Promise<void> {
  const config = readWranglerToml(cwd)
  const env = options.env

  // Prompt for binding name
  const bindingName = await input({
    message: 'Binding name (e.g., CACHE):',
    validate: (value) => {
      if (!value.trim()) return 'Binding name is required'
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(value))
        return 'Binding name must be alphanumeric with underscores'
      if (bindingExists(config, value, env))
        return `Binding "${value}" already exists`
      return true
    },
  })

  // Ask whether to create new or use existing
  const createNew = await confirm({
    message: 'Create a new KV namespace?',
    default: true,
  })

  let namespaceId: string

  if (createNew) {
    // Create new namespace (use binding name as title)
    console.log()
    console.log(pc.dim(`Creating KV namespace "${bindingName}"...`))

    const result = await runWranglerCommand([
      'kv',
      'namespace',
      'create',
      bindingName,
    ])
    const idMatch = result.match(/id\s*=\s*"([^"]+)"/)

    if (!idMatch) {
      throw new CliError(
        'Failed to parse namespace ID from wrangler output',
        'EPARSE',
        'Try creating the namespace manually with: wrangler kv namespace create ' +
          bindingName
      )
    }

    namespaceId = idMatch[1]
    console.log(pc.green('\u2713') + ` Created namespace: ${namespaceId}`)
  } else {
    // List existing namespaces
    const namespaces = await listKVNamespaces()

    if (namespaces.length === 0) {
      throw new CliError(
        'No KV namespaces found',
        'ENOENT',
        'Create a namespace first with: wrangler kv namespace create <name>'
      )
    }

    const selected = await select({
      message: 'Select an existing namespace:',
      choices: namespaces.map((ns) => ({
        name: `${ns.title} (${ns.id.slice(0, 8)}...)`,
        value: ns.id,
      })),
    })

    namespaceId = selected
  }

  // Add to wrangler.toml
  addKVBinding(cwd, bindingName, namespaceId, undefined, env)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')

  showTypeHint(bindingName, 'kv')
}

async function listKVNamespaces(): Promise<WranglerKVNamespace[]> {
  const output = await runWranglerCommand(['kv', 'namespace', 'list', '--json'])
  return JSON.parse(output) as WranglerKVNamespace[]
}

// ============================================================================
// R2 Bucket
// ============================================================================

async function addR2(
  cwd: string,
  options: BindingsAddCommandOptions
): Promise<void> {
  const config = readWranglerToml(cwd)
  const env = options.env

  // Prompt for binding name
  const bindingName = await input({
    message: 'Binding name (e.g., STORAGE):',
    validate: (value) => {
      if (!value.trim()) return 'Binding name is required'
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(value))
        return 'Binding name must be alphanumeric with underscores'
      if (bindingExists(config, value, env))
        return `Binding "${value}" already exists`
      return true
    },
  })

  // Ask whether to create new or use existing
  const createNew = await confirm({
    message: 'Create a new R2 bucket?',
    default: true,
  })

  let bucketName: string

  if (createNew) {
    // Prompt for bucket name
    bucketName = await input({
      message: 'Bucket name:',
      default: `${config.name || 'my-app'}${env ? `-${env}` : ''}-bucket`,
      validate: (value) => {
        if (!value.trim()) return 'Bucket name is required'
        return true
      },
    })

    // Create new bucket
    console.log()
    console.log(pc.dim(`Creating R2 bucket "${bucketName}"...`))

    await runWranglerCommand(['r2', 'bucket', 'create', bucketName])
    console.log(pc.green('\u2713') + ` Created bucket: ${bucketName}`)
  } else {
    // List existing buckets
    const buckets = await listR2Buckets()

    if (buckets.length === 0) {
      throw new CliError(
        'No R2 buckets found',
        'ENOENT',
        'Create a bucket first with: wrangler r2 bucket create <name>'
      )
    }

    const selected = await select({
      message: 'Select an existing bucket:',
      choices: buckets.map((bucket) => ({
        name: bucket.name,
        value: bucket.name,
      })),
    })

    bucketName = selected
  }

  // Add to wrangler.toml
  addR2Binding(cwd, bindingName, bucketName, env)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')

  showTypeHint(bindingName, 'r2')
}

async function listR2Buckets(): Promise<WranglerR2Bucket[]> {
  const output = await runWranglerCommand(['r2', 'bucket', 'list', '--json'])
  return JSON.parse(output) as WranglerR2Bucket[]
}

// ============================================================================
// Queue
// ============================================================================

async function addQueue(
  cwd: string,
  options: BindingsAddCommandOptions
): Promise<void> {
  const config = readWranglerToml(cwd)
  const env = options.env

  // Prompt for binding name
  const bindingName = await input({
    message: 'Binding name (e.g., JOBS):',
    validate: (value) => {
      if (!value.trim()) return 'Binding name is required'
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(value))
        return 'Binding name must be alphanumeric with underscores'
      if (bindingExists(config, value, env))
        return `Binding "${value}" already exists`
      return true
    },
  })

  // Ask whether to create new or use existing
  const createNew = await confirm({
    message: 'Create a new queue?',
    default: true,
  })

  let queueName: string

  if (createNew) {
    // Prompt for queue name
    queueName = await input({
      message: 'Queue name:',
      default: `${config.name || 'my-app'}${env ? `-${env}` : ''}-queue`,
      validate: (value) => {
        if (!value.trim()) return 'Queue name is required'
        return true
      },
    })

    // Create new queue
    console.log()
    console.log(pc.dim(`Creating queue "${queueName}"...`))

    await runWranglerCommand(['queues', 'create', queueName])
    console.log(pc.green('\u2713') + ` Created queue: ${queueName}`)
  } else {
    // List existing queues
    const queues = await listQueues()

    if (queues.length === 0) {
      throw new CliError(
        'No queues found',
        'ENOENT',
        'Create a queue first with: wrangler queues create <name>'
      )
    }

    const selected = await select({
      message: 'Select an existing queue:',
      choices: queues.map((queue) => ({
        name: queue.queue_name,
        value: queue.queue_name,
      })),
    })

    queueName = selected
  }

  // Add to wrangler.toml
  addQueueBinding(cwd, bindingName, queueName, env)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')

  showTypeHint(bindingName, 'queue')
}

async function listQueues(): Promise<WranglerQueue[]> {
  const output = await runWranglerCommand(['queues', 'list', '--json'])
  return JSON.parse(output) as WranglerQueue[]
}

// ============================================================================
// Durable Object
// ============================================================================

async function addDurableObject(
  cwd: string,
  options: BindingsAddCommandOptions
): Promise<void> {
  const config = readWranglerToml(cwd)
  const env = options.env

  // Prompt for binding name
  const bindingName = await input({
    message: 'Binding name (e.g., COUNTER):',
    validate: (value) => {
      if (!value.trim()) return 'Binding name is required'
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(value))
        return 'Binding name must be alphanumeric with underscores'
      if (bindingExists(config, value, env))
        return `Binding "${value}" already exists`
      return true
    },
  })

  // Prompt for class name
  const className = await input({
    message: 'Durable Object class name:',
    default: bindingName
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(''),
    validate: (value) => {
      if (!value.trim()) return 'Class name is required'
      return true
    },
  })

  // Ask about script name (for external DO)
  const isExternal = await confirm({
    message: 'Is this a Durable Object from another Worker?',
    default: false,
  })

  let scriptName: string | undefined
  if (isExternal) {
    scriptName = await input({
      message: 'Worker script name:',
      validate: (value) => {
        if (!value.trim()) return 'Script name is required'
        return true
      },
    })
  }

  // Add to wrangler.toml
  addDurableObjectBinding(cwd, bindingName, className, scriptName, env)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')

  showTypeHint(bindingName, 'do')

  // Show reminder about DO class
  if (!isExternal) {
    console.log()
    console.log(pc.dim('Remember to export your Durable Object class:'))
    console.log(pc.dim(`  export class ${className} extends DurableObject { ... }`))
  }
}

// ============================================================================
// Secret / Environment Variable
// ============================================================================

async function addSecret(
  cwd: string,
  options: BindingsAddCommandOptions
): Promise<void> {
  const config = readWranglerToml(cwd)
  const env = options.env

  // Prompt for variable name
  const varName = await input({
    message: 'Variable name (e.g., API_KEY):',
    validate: (value) => {
      if (!value.trim()) return 'Variable name is required'
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(value))
        return 'Variable name must be alphanumeric with underscores'
      if (bindingExists(config, value, env))
        return `Variable "${value}" already exists`
      return true
    },
  })

  // Ask if it's a secret (sensitive) or a regular var
  const isSecret = await confirm({
    message: 'Is this a secret (sensitive value)?',
    default: true,
  })

  if (isSecret) {
    // Use wrangler secret put
    console.log()
    console.log(pc.dim('Enter the secret value (will be hidden):'))

    const varValue = await input({
      message: 'Secret value:',
    })

    console.log()
    console.log(pc.dim(`Setting secret "${varName}"...`))

    const args = ['secret', 'put', varName]
    if (env) args.push('--env', env)

    await runWranglerCommandWithInput(args, varValue)
    console.log(pc.green('\u2713') + ` Secret "${varName}" set`)
    console.log()
    console.log(
      pc.dim('Note: Secrets are stored securely and not written to wrangler.toml.')
    )
  } else {
    // Add as a regular var to wrangler.toml
    const varValue = await input({
      message: 'Variable value:',
      validate: (value) => {
        if (!value.trim()) return 'Value is required'
        return true
      },
    })

    addSecretBinding(cwd, varName, varValue, env)
    console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  }

  showTypeHint(varName, 'secret')
}

// ============================================================================
// Type Generation
// ============================================================================

async function regenerateTypes(cwd: string): Promise<void> {
  const config = readWranglerToml(cwd)
  const bindings = extractBindings(config)

  if (bindings.length === 0) {
    return
  }

  const result = generateEnvTypes(cwd, bindings)
  console.log(pc.green('\u2713') + ` Updated env.d.ts with ${result.bindingCount} binding(s)`)
}

function showTypeHint(bindingName: string, type: BindingType): void {
  const tsType = getTypeForBinding(type)
  console.log()
  console.log(pc.dim(`TypeScript type: ${bindingName}: ${tsType}`))
}

// ============================================================================
// Wrangler Command Helpers
// ============================================================================

/**
 * Parse available Cloudflare accounts from a wrangler error message.
 */
function parseAccountsFromError(errorMessage: string): CloudflareAccount[] {
  const accounts: CloudflareAccount[] = []

  // Match lines like: `Chris@ctrlabs.io's Account`: `21340ce16c468f10952f6f9946eaf2d1`
  const accountRegex = /`([^`]+)`:\s*`([a-f0-9]+)`/g
  let match

  while ((match = accountRegex.exec(errorMessage)) !== null) {
    accounts.push({
      name: match[1],
      id: match[2],
    })
  }

  return accounts
}

/**
 * Check if an error is a multi-account error.
 */
function isMultiAccountError(errorMessage: string): boolean {
  return errorMessage.includes('More than one account available')
}

/**
 * Prompt user to select a Cloudflare account.
 */
async function promptForAccount(accounts: CloudflareAccount[]): Promise<string> {
  console.log()
  const selected = await select({
    message: 'Multiple Cloudflare accounts available. Which account do you want to use?',
    choices: accounts.map((account) => ({
      name: `${account.name} (${account.id.slice(0, 8)}...)`,
      value: account.id,
    })),
  })

  return selected
}

/**
 * Raw result from a wrangler command.
 */
interface WranglerCommandResult {
  stdout: string
  stderr: string
  code: number | null
  error: boolean
}

/**
 * Handle wrangler command result with multi-account error recovery.
 * If a multi-account error is detected, prompts user to select an account,
 * saves it to wrangler.toml, and retries the command.
 */
async function handleWranglerResult(
  result: WranglerCommandResult,
  retryFn: () => Promise<WranglerCommandResult>,
  cwd?: string
): Promise<string> {
  if (result.error && isMultiAccountError(result.stderr)) {
    const accounts = parseAccountsFromError(result.stderr)

    if (accounts.length > 0) {
      const selectedAccountId = await promptForAccount(accounts)

      // Set account_id in wrangler.toml
      const projectCwd = cwd || process.cwd()
      setAccountId(projectCwd, selectedAccountId)
      console.log(pc.green('\u2713') + ' Set account_id in wrangler.toml')
      console.log()

      // Retry the command
      const retryResult = await retryFn()
      if (retryResult.error) {
        throw new Error(retryResult.stderr || `wrangler exited with code ${retryResult.code}`)
      }
      return retryResult.stdout
    }
  }

  if (result.error) {
    throw new Error(result.stderr || `wrangler exited with code ${result.code}`)
  }

  return result.stdout
}

/**
 * Run a wrangler command and return stdout.
 * Handles multi-account errors by prompting user to select an account.
 */
async function runWranglerCommand(args: string[], cwd?: string): Promise<string> {
  const result = await runWranglerCommandRaw(args)
  return handleWranglerResult(result, () => runWranglerCommandRaw(args), cwd)
}

/**
 * Run a wrangler command and return raw result (uses spawn with separate args for security).
 */
function runWranglerCommandRaw(args: string[]): Promise<WranglerCommandResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    const child = spawn('npx', ['wrangler', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      resolve({ stdout, stderr: error.message, code: null, error: true })
    })

    child.on('close', (code) => {
      resolve({ stdout, stderr, code, error: code !== 0 })
    })
  })
}

/**
 * Run a wrangler command with stdin input.
 * Handles multi-account errors by prompting user to select an account.
 */
async function runWranglerCommandWithInput(
  args: string[],
  inputData: string,
  cwd?: string
): Promise<string> {
  const result = await runWranglerCommandWithInputRaw(args, inputData)
  return handleWranglerResult(
    result,
    () => runWranglerCommandWithInputRaw(args, inputData),
    cwd
  )
}

/**
 * Run a wrangler command with stdin input and return raw result.
 */
function runWranglerCommandWithInputRaw(
  args: string[],
  inputData: string
): Promise<WranglerCommandResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    const child = spawn('npx', ['wrangler', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      resolve({ stdout, stderr: error.message, code: null, error: true })
    })

    child.on('close', (code) => {
      resolve({ stdout, stderr, code, error: code !== 0 })
    })

    // Write input and close stdin
    child.stdin?.write(inputData)
    child.stdin?.end()
  })
}
