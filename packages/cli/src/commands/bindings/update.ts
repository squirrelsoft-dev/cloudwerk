/**
 * @cloudwerk/cli - Bindings Update Command
 *
 * Update existing Cloudflare bindings in wrangler.toml.
 */

import { spawn } from 'node:child_process'
import pc from 'picocolors'
import { input, select } from '@inquirer/prompts'

import type { BindingsUpdateCommandOptions } from '../../types.js'
import { CliError } from '../../types.js'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import {
  findWranglerToml,
  readWranglerToml,
  writeWranglerToml,
  extractBindings,
  getBindingTypeName,
  type WranglerConfig,
  type Binding,
} from '../../utils/wrangler-toml.js'
import { generateEnvTypes } from '../../utils/env-types.js'

// ============================================================================
// Update Binding Command
// ============================================================================

/**
 * Update an existing binding in wrangler.toml.
 *
 * @param bindingName - Name of the binding to update (optional - will prompt if not provided)
 * @param options - Command options
 */
export async function bindingsUpdate(
  bindingName: string | undefined,
  options: BindingsUpdateCommandOptions
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

    // Read config
    const config = readWranglerToml(cwd)
    const bindings = extractBindings(config, env)

    if (bindings.length === 0) {
      const envLabel = env ? ` in ${env}` : ''
      throw new CliError(
        `No bindings found${envLabel}`,
        'ENOENT',
        `Use 'cloudwerk bindings add' to add a binding first.`
      )
    }

    // If no binding name provided, prompt for one
    let targetBinding = bindingName

    if (!targetBinding) {
      targetBinding = await select({
        message: 'Select a binding to update:',
        choices: bindings.map((b) => ({
          name: `${b.name} (${getBindingTypeName(b.type)})`,
          value: b.name,
        })),
      })
    }

    // Verify binding exists
    const binding = bindings.find((b) => b.name === targetBinding)
    if (!binding) {
      const envLabel = env ? ` in ${env}` : ''
      throw new CliError(
        `Binding "${targetBinding}" not found${envLabel}`,
        'ENOENT',
        `Use 'cloudwerk bindings' to see available bindings.`
      )
    }

    console.log()
    logger.info(
      `Updating ${getBindingTypeName(binding.type)} binding "${targetBinding}"...`
    )

    // Dispatch to the appropriate update handler
    const updated = await updateBinding(cwd, config, binding, env)

    if (!updated) {
      console.log(pc.dim('No changes made.'))
      return
    }

    // Regenerate types
    if (!options.skipTypes) {
      const updatedConfig = readWranglerToml(cwd)
      const updatedBindings = extractBindings(updatedConfig)

      if (updatedBindings.length > 0) {
        const result = generateEnvTypes(cwd, updatedBindings)
        console.log(
          pc.green('\u2713') +
            ` Updated env.d.ts with ${result.bindingCount} binding(s)`
        )
      }
    }

    console.log()
    logger.success('Binding updated successfully!')
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}

// ============================================================================
// Binding Update Handlers
// ============================================================================

/**
 * Update a specific binding based on its type.
 */
async function updateBinding(
  cwd: string,
  config: WranglerConfig,
  binding: Binding,
  env?: string
): Promise<boolean> {
  // Select what to update
  const updateOptions = getUpdateOptions(binding)

  if (updateOptions.length === 0) {
    console.log(pc.dim('This binding type has no updatable fields.'))
    return false
  }

  const field = await select({
    message: 'What do you want to update?',
    choices: updateOptions,
  })

  // Get the target config (base or environment)
  const targetConfig = env ? (config.env?.[env] ?? config) : config

  switch (binding.type) {
    case 'd1':
      return updateD1(cwd, config, targetConfig, binding.name, field)
    case 'kv':
      return updateKV(cwd, config, targetConfig, binding.name, field)
    case 'r2':
      return updateR2(cwd, config, targetConfig, binding.name, field)
    case 'queue':
      return updateQueue(cwd, config, targetConfig, binding.name, field)
    case 'do':
      return updateDurableObject(cwd, config, targetConfig, binding.name, field)
    case 'secret':
      return updateSecret(cwd, config, targetConfig, binding.name, field, env)
    default:
      console.log(pc.dim(`Updating ${binding.type} bindings is not yet supported.`))
      return false
  }
}

/**
 * Get available update options for a binding type.
 */
function getUpdateOptions(
  binding: Binding
): Array<{ name: string; value: string }> {
  switch (binding.type) {
    case 'd1':
      return [
        { name: 'Binding name', value: 'name' },
        { name: 'Database name', value: 'database_name' },
        { name: 'Database ID', value: 'database_id' },
      ]
    case 'kv':
      return [
        { name: 'Binding name', value: 'name' },
        { name: 'Namespace ID', value: 'id' },
        { name: 'Preview ID', value: 'preview_id' },
      ]
    case 'r2':
      return [
        { name: 'Binding name', value: 'name' },
        { name: 'Bucket name', value: 'bucket_name' },
      ]
    case 'queue':
      return [
        { name: 'Binding name', value: 'name' },
        { name: 'Queue name', value: 'queue' },
      ]
    case 'do':
      return [
        { name: 'Binding name', value: 'name' },
        { name: 'Class name', value: 'class_name' },
        { name: 'Script name', value: 'script_name' },
      ]
    case 'secret':
      return [
        { name: 'Variable name', value: 'name' },
        { name: 'Value', value: 'value' },
      ]
    default:
      return []
  }
}

// ============================================================================
// Type-Specific Update Handlers
// ============================================================================

async function updateD1(
  cwd: string,
  config: WranglerConfig,
  targetConfig: WranglerConfig,
  bindingName: string,
  field: string
): Promise<boolean> {
  const bindings = targetConfig.d1_databases
  if (!bindings) return false

  const binding = bindings.find((b) => b.binding === bindingName)
  if (!binding) return false

  switch (field) {
    case 'name': {
      const newName = await input({
        message: 'New binding name:',
        default: binding.binding,
      })
      if (newName === binding.binding) return false
      binding.binding = newName
      break
    }
    case 'database_name': {
      const newName = await input({
        message: 'New database name:',
        default: binding.database_name,
      })
      if (newName === binding.database_name) return false
      binding.database_name = newName
      break
    }
    case 'database_id': {
      const newId = await input({
        message: 'New database ID:',
        default: binding.database_id,
      })
      if (newId === binding.database_id) return false
      binding.database_id = newId
      break
    }
  }

  writeWranglerToml(cwd, config)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  return true
}

async function updateKV(
  cwd: string,
  config: WranglerConfig,
  targetConfig: WranglerConfig,
  bindingName: string,
  field: string
): Promise<boolean> {
  const bindings = targetConfig.kv_namespaces
  if (!bindings) return false

  const binding = bindings.find((b) => b.binding === bindingName)
  if (!binding) return false

  switch (field) {
    case 'name': {
      const newName = await input({
        message: 'New binding name:',
        default: binding.binding,
      })
      if (newName === binding.binding) return false
      binding.binding = newName
      break
    }
    case 'id': {
      const newId = await input({
        message: 'New namespace ID:',
        default: binding.id,
      })
      if (newId === binding.id) return false
      binding.id = newId
      break
    }
    case 'preview_id': {
      const newId = await input({
        message: 'New preview ID (leave empty to remove):',
        default: binding.preview_id || '',
      })
      if (newId === (binding.preview_id || '')) return false
      if (newId) {
        binding.preview_id = newId
      } else {
        delete binding.preview_id
      }
      break
    }
  }

  writeWranglerToml(cwd, config)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  return true
}

async function updateR2(
  cwd: string,
  config: WranglerConfig,
  targetConfig: WranglerConfig,
  bindingName: string,
  field: string
): Promise<boolean> {
  const bindings = targetConfig.r2_buckets
  if (!bindings) return false

  const binding = bindings.find((b) => b.binding === bindingName)
  if (!binding) return false

  switch (field) {
    case 'name': {
      const newName = await input({
        message: 'New binding name:',
        default: binding.binding,
      })
      if (newName === binding.binding) return false
      binding.binding = newName
      break
    }
    case 'bucket_name': {
      const newName = await input({
        message: 'New bucket name:',
        default: binding.bucket_name,
      })
      if (newName === binding.bucket_name) return false
      binding.bucket_name = newName
      break
    }
  }

  writeWranglerToml(cwd, config)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  return true
}

async function updateQueue(
  cwd: string,
  config: WranglerConfig,
  targetConfig: WranglerConfig,
  bindingName: string,
  field: string
): Promise<boolean> {
  const bindings = targetConfig.queues?.producers
  if (!bindings) return false

  const binding = bindings.find((b) => b.binding === bindingName)
  if (!binding) return false

  switch (field) {
    case 'name': {
      const newName = await input({
        message: 'New binding name:',
        default: binding.binding,
      })
      if (newName === binding.binding) return false
      binding.binding = newName
      break
    }
    case 'queue': {
      const newName = await input({
        message: 'New queue name:',
        default: binding.queue,
      })
      if (newName === binding.queue) return false
      binding.queue = newName
      break
    }
  }

  writeWranglerToml(cwd, config)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  return true
}

async function updateDurableObject(
  cwd: string,
  config: WranglerConfig,
  targetConfig: WranglerConfig,
  bindingName: string,
  field: string
): Promise<boolean> {
  const bindings = targetConfig.durable_objects?.bindings
  if (!bindings) return false

  const binding = bindings.find((b) => b.name === bindingName)
  if (!binding) return false

  switch (field) {
    case 'name': {
      const newName = await input({
        message: 'New binding name:',
        default: binding.name,
      })
      if (newName === binding.name) return false
      binding.name = newName
      break
    }
    case 'class_name': {
      const newName = await input({
        message: 'New class name:',
        default: binding.class_name,
      })
      if (newName === binding.class_name) return false
      binding.class_name = newName
      break
    }
    case 'script_name': {
      const newName = await input({
        message: 'New script name (leave empty to remove):',
        default: binding.script_name || '',
      })
      if (newName === (binding.script_name || '')) return false
      if (newName) {
        binding.script_name = newName
      } else {
        delete binding.script_name
      }
      break
    }
  }

  writeWranglerToml(cwd, config)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  return true
}

async function updateSecret(
  cwd: string,
  config: WranglerConfig,
  targetConfig: WranglerConfig,
  varName: string,
  field: string,
  env?: string
): Promise<boolean> {
  const vars = targetConfig.vars
  const isInToml = vars && varName in vars

  // If variable is not in wrangler.toml, it's a secret managed by wrangler
  if (!isInToml) {
    if (field === 'name') {
      console.log()
      console.log(
        pc.yellow('\u26A0') +
          ' Secrets managed by wrangler cannot be renamed directly.'
      )
      console.log(
        pc.dim(
          '  To rename, delete the old secret and create a new one with:'
        )
      )
      console.log(pc.dim(`    wrangler secret delete ${varName}`))
      console.log(pc.dim(`    wrangler secret put <new-name>`))
      return false
    }

    // Update secret value via wrangler
    console.log()
    console.log(
      pc.dim('This is a secret managed by wrangler. Enter the new value:')
    )

    const newValue = await input({
      message: 'New secret value:',
    })

    if (!newValue.trim()) {
      console.log(pc.dim('No value provided.'))
      return false
    }

    const args = ['secret', 'put', varName]
    if (env) args.push('--env', env)

    console.log()
    console.log(pc.dim(`Updating secret "${varName}"...`))

    await runWranglerCommandWithInput(args, newValue)
    console.log(pc.green('\u2713') + ` Secret "${varName}" updated`)
    return true
  }

  // Variable is in wrangler.toml - update directly
  switch (field) {
    case 'name': {
      const newName = await input({
        message: 'New variable name:',
        default: varName,
      })
      if (newName === varName) return false

      // Rename the variable
      const value = vars[varName]
      delete vars[varName]
      vars[newName] = value
      break
    }
    case 'value': {
      const newValue = await input({
        message: 'New value:',
        default: vars[varName],
      })
      if (newValue === vars[varName]) return false
      vars[varName] = newValue
      break
    }
  }

  writeWranglerToml(cwd, config)
  console.log(pc.green('\u2713') + ' Updated wrangler.toml')
  return true
}

// ============================================================================
// Wrangler Command Helpers
// ============================================================================

/**
 * Run a wrangler command with stdin input.
 */
function runWranglerCommandWithInput(
  args: string[],
  inputData: string
): Promise<string> {
  return new Promise((resolve, reject) => {
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
      reject(error)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `wrangler exited with code ${code}`))
      } else {
        resolve(stdout)
      }
    })

    // Write input and close stdin
    child.stdin?.write(inputData)
    child.stdin?.end()
  })
}
