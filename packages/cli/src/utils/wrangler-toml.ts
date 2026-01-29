/**
 * @cloudwerk/cli - Wrangler TOML Utilities
 *
 * Read, parse, and write wrangler.toml files with binding management.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import TOML from '@iarna/toml'

// ============================================================================
// Types
// ============================================================================

/**
 * Supported binding types.
 */
export type BindingType =
  | 'd1'
  | 'kv'
  | 'r2'
  | 'queue'
  | 'do'
  | 'service'
  | 'secret'
  | 'ai'
  | 'vectorize'
  | 'hyperdrive'

/**
 * A binding configuration parsed from wrangler.toml.
 */
export interface Binding {
  type: BindingType
  name: string
  resourceId?: string
  resourceName?: string
  extra?: Record<string, unknown>
}

/**
 * Wrangler.toml structure (partial, for bindings).
 */
export interface WranglerConfig {
  name?: string
  d1_databases?: D1DatabaseBinding[]
  kv_namespaces?: KVNamespaceBinding[]
  r2_buckets?: R2BucketBinding[]
  queues?: QueuesConfig
  durable_objects?: DurableObjectsConfig
  services?: ServiceBinding[]
  vars?: Record<string, string>
  ai?: AIBinding
  vectorize?: VectorizeBinding[]
  hyperdrive?: HyperdriveBinding[]
  env?: Record<string, WranglerConfig>
}

export interface D1DatabaseBinding {
  binding: string
  database_name: string
  database_id: string
}

export interface KVNamespaceBinding {
  binding: string
  id: string
  preview_id?: string
}

export interface R2BucketBinding {
  binding: string
  bucket_name: string
}

export interface QueuesConfig {
  producers?: QueueProducerBinding[]
  consumers?: QueueConsumerBinding[]
}

export interface QueueProducerBinding {
  binding: string
  queue: string
}

export interface QueueConsumerBinding {
  queue: string
  max_batch_size?: number
  max_batch_timeout?: number
  max_retries?: number
  dead_letter_queue?: string
}

export interface DurableObjectsConfig {
  bindings?: DurableObjectBinding[]
}

export interface DurableObjectBinding {
  name: string
  class_name: string
  script_name?: string
}

export interface ServiceBinding {
  binding: string
  service: string
  environment?: string
}

export interface AIBinding {
  binding: string
}

export interface VectorizeBinding {
  binding: string
  index_name: string
}

export interface HyperdriveBinding {
  binding: string
  id: string
}

// ============================================================================
// Read/Write Functions
// ============================================================================

/**
 * Find wrangler.toml in the given directory.
 */
export function findWranglerToml(cwd: string): string | null {
  const wranglerPath = path.join(cwd, 'wrangler.toml')
  if (fs.existsSync(wranglerPath)) {
    return wranglerPath
  }

  const wranglerJsonPath = path.join(cwd, 'wrangler.json')
  if (fs.existsSync(wranglerJsonPath)) {
    return wranglerJsonPath
  }

  return null
}

/**
 * Read and parse wrangler.toml.
 */
export function readWranglerToml(cwd: string): WranglerConfig {
  const configPath = findWranglerToml(cwd)

  if (!configPath) {
    return {}
  }

  const content = fs.readFileSync(configPath, 'utf-8')

  if (configPath.endsWith('.json')) {
    return JSON.parse(content) as WranglerConfig
  }

  return TOML.parse(content) as unknown as WranglerConfig
}

/**
 * Write wrangler.toml with updated config.
 */
export function writeWranglerToml(cwd: string, config: WranglerConfig): void {
  const configPath = path.join(cwd, 'wrangler.toml')
  const content = TOML.stringify(config as unknown as TOML.JsonMap)
  fs.writeFileSync(configPath, content, 'utf-8')
}

/**
 * Read the raw content of wrangler.toml for manual manipulation.
 */
export function readWranglerTomlRaw(cwd: string): string {
  const configPath = findWranglerToml(cwd)
  if (!configPath || configPath.endsWith('.json')) {
    return ''
  }
  return fs.readFileSync(configPath, 'utf-8')
}

/**
 * Write raw content to wrangler.toml.
 */
export function writeWranglerTomlRaw(cwd: string, content: string): void {
  const configPath = path.join(cwd, 'wrangler.toml')
  fs.writeFileSync(configPath, content, 'utf-8')
}

// ============================================================================
// Binding Extraction
// ============================================================================

/**
 * Get the configuration for a specific environment, merged with base config.
 */
export function getEnvConfig(
  config: WranglerConfig,
  env?: string
): WranglerConfig {
  if (!env || !config.env?.[env]) {
    return config
  }

  // Environment config overrides base config for bindings
  return {
    ...config,
    ...config.env[env],
  }
}

/**
 * Extract all bindings from wrangler.toml config.
 */
export function extractBindings(
  config: WranglerConfig,
  env?: string
): Binding[] {
  const envConfig = getEnvConfig(config, env)
  const bindings: Binding[] = []

  // D1 Databases
  if (envConfig.d1_databases) {
    for (const db of envConfig.d1_databases) {
      bindings.push({
        type: 'd1',
        name: db.binding,
        resourceId: db.database_id,
        resourceName: db.database_name,
      })
    }
  }

  // KV Namespaces
  if (envConfig.kv_namespaces) {
    for (const kv of envConfig.kv_namespaces) {
      bindings.push({
        type: 'kv',
        name: kv.binding,
        resourceId: kv.id,
      })
    }
  }

  // R2 Buckets
  if (envConfig.r2_buckets) {
    for (const r2 of envConfig.r2_buckets) {
      bindings.push({
        type: 'r2',
        name: r2.binding,
        resourceName: r2.bucket_name,
      })
    }
  }

  // Queue Producers
  if (envConfig.queues?.producers) {
    for (const queue of envConfig.queues.producers) {
      bindings.push({
        type: 'queue',
        name: queue.binding,
        resourceName: queue.queue,
      })
    }
  }

  // Durable Objects
  if (envConfig.durable_objects?.bindings) {
    for (const doBinding of envConfig.durable_objects.bindings) {
      bindings.push({
        type: 'do',
        name: doBinding.name,
        resourceName: doBinding.class_name,
        extra: doBinding.script_name
          ? { script_name: doBinding.script_name }
          : undefined,
      })
    }
  }

  // Services
  if (envConfig.services) {
    for (const service of envConfig.services) {
      bindings.push({
        type: 'service',
        name: service.binding,
        resourceName: service.service,
        extra: service.environment
          ? { environment: service.environment }
          : undefined,
      })
    }
  }

  // Secrets/Vars
  if (envConfig.vars) {
    for (const [name] of Object.entries(envConfig.vars)) {
      bindings.push({
        type: 'secret',
        name,
      })
    }
  }

  // AI
  if (envConfig.ai) {
    bindings.push({
      type: 'ai',
      name: envConfig.ai.binding,
    })
  }

  // Vectorize
  if (envConfig.vectorize) {
    for (const vec of envConfig.vectorize) {
      bindings.push({
        type: 'vectorize',
        name: vec.binding,
        resourceName: vec.index_name,
      })
    }
  }

  // Hyperdrive
  if (envConfig.hyperdrive) {
    for (const hd of envConfig.hyperdrive) {
      bindings.push({
        type: 'hyperdrive',
        name: hd.binding,
        resourceId: hd.id,
      })
    }
  }

  return bindings
}

/**
 * Get all environment names from wrangler.toml.
 */
export function getEnvironments(config: WranglerConfig): string[] {
  if (!config.env) {
    return []
  }
  return Object.keys(config.env)
}

// ============================================================================
// Binding Manipulation
// ============================================================================

/**
 * Add a D1 database binding to wrangler.toml.
 */
export function addD1Binding(
  cwd: string,
  bindingName: string,
  databaseName: string,
  databaseId: string,
  env?: string
): void {
  const config = readWranglerToml(cwd)

  const newBinding: D1DatabaseBinding = {
    binding: bindingName,
    database_name: databaseName,
    database_id: databaseId,
  }

  if (env) {
    if (!config.env) config.env = {}
    if (!config.env[env]) config.env[env] = {}
    if (!config.env[env].d1_databases) config.env[env].d1_databases = []
    config.env[env].d1_databases.push(newBinding)
  } else {
    if (!config.d1_databases) config.d1_databases = []
    config.d1_databases.push(newBinding)
  }

  writeWranglerToml(cwd, config)
}

/**
 * Add a KV namespace binding to wrangler.toml.
 */
export function addKVBinding(
  cwd: string,
  bindingName: string,
  namespaceId: string,
  previewId?: string,
  env?: string
): void {
  const config = readWranglerToml(cwd)

  const newBinding: KVNamespaceBinding = {
    binding: bindingName,
    id: namespaceId,
  }
  if (previewId) {
    newBinding.preview_id = previewId
  }

  if (env) {
    if (!config.env) config.env = {}
    if (!config.env[env]) config.env[env] = {}
    if (!config.env[env].kv_namespaces) config.env[env].kv_namespaces = []
    config.env[env].kv_namespaces.push(newBinding)
  } else {
    if (!config.kv_namespaces) config.kv_namespaces = []
    config.kv_namespaces.push(newBinding)
  }

  writeWranglerToml(cwd, config)
}

/**
 * Add an R2 bucket binding to wrangler.toml.
 */
export function addR2Binding(
  cwd: string,
  bindingName: string,
  bucketName: string,
  env?: string
): void {
  const config = readWranglerToml(cwd)

  const newBinding: R2BucketBinding = {
    binding: bindingName,
    bucket_name: bucketName,
  }

  if (env) {
    if (!config.env) config.env = {}
    if (!config.env[env]) config.env[env] = {}
    if (!config.env[env].r2_buckets) config.env[env].r2_buckets = []
    config.env[env].r2_buckets.push(newBinding)
  } else {
    if (!config.r2_buckets) config.r2_buckets = []
    config.r2_buckets.push(newBinding)
  }

  writeWranglerToml(cwd, config)
}

/**
 * Add a queue producer binding to wrangler.toml.
 */
export function addQueueBinding(
  cwd: string,
  bindingName: string,
  queueName: string,
  env?: string
): void {
  const config = readWranglerToml(cwd)

  const newBinding: QueueProducerBinding = {
    binding: bindingName,
    queue: queueName,
  }

  if (env) {
    if (!config.env) config.env = {}
    if (!config.env[env]) config.env[env] = {}
    if (!config.env[env].queues) config.env[env].queues = {}
    if (!config.env[env].queues!.producers)
      config.env[env].queues!.producers = []
    config.env[env].queues!.producers.push(newBinding)
  } else {
    if (!config.queues) config.queues = {}
    if (!config.queues.producers) config.queues.producers = []
    config.queues.producers.push(newBinding)
  }

  writeWranglerToml(cwd, config)
}

/**
 * Add a durable object binding to wrangler.toml.
 */
export function addDurableObjectBinding(
  cwd: string,
  bindingName: string,
  className: string,
  scriptName?: string,
  env?: string
): void {
  const config = readWranglerToml(cwd)

  const newBinding: DurableObjectBinding = {
    name: bindingName,
    class_name: className,
  }
  if (scriptName) {
    newBinding.script_name = scriptName
  }

  if (env) {
    if (!config.env) config.env = {}
    if (!config.env[env]) config.env[env] = {}
    if (!config.env[env].durable_objects)
      config.env[env].durable_objects = { bindings: [] }
    config.env[env].durable_objects!.bindings!.push(newBinding)
  } else {
    if (!config.durable_objects) config.durable_objects = { bindings: [] }
    if (!config.durable_objects.bindings) config.durable_objects.bindings = []
    config.durable_objects.bindings.push(newBinding)
  }

  writeWranglerToml(cwd, config)
}

/**
 * Add a secret/variable binding to wrangler.toml.
 */
export function addSecretBinding(
  cwd: string,
  name: string,
  value: string,
  env?: string
): void {
  const config = readWranglerToml(cwd)

  if (env) {
    if (!config.env) config.env = {}
    if (!config.env[env]) config.env[env] = {}
    if (!config.env[env].vars) config.env[env].vars = {}
    config.env[env].vars![name] = value
  } else {
    if (!config.vars) config.vars = {}
    config.vars[name] = value
  }

  writeWranglerToml(cwd, config)
}

/**
 * Remove a binding from wrangler.toml by name.
 */
export function removeBinding(
  cwd: string,
  bindingName: string,
  env?: string
): boolean {
  const config = readWranglerToml(cwd)
  let removed = false

  const removeFromConfig = (cfg: WranglerConfig): boolean => {
    let found = false

    // D1
    if (cfg.d1_databases) {
      const idx = cfg.d1_databases.findIndex((b) => b.binding === bindingName)
      if (idx !== -1) {
        cfg.d1_databases.splice(idx, 1)
        if (cfg.d1_databases.length === 0) delete cfg.d1_databases
        found = true
      }
    }

    // KV
    if (cfg.kv_namespaces) {
      const idx = cfg.kv_namespaces.findIndex((b) => b.binding === bindingName)
      if (idx !== -1) {
        cfg.kv_namespaces.splice(idx, 1)
        if (cfg.kv_namespaces.length === 0) delete cfg.kv_namespaces
        found = true
      }
    }

    // R2
    if (cfg.r2_buckets) {
      const idx = cfg.r2_buckets.findIndex((b) => b.binding === bindingName)
      if (idx !== -1) {
        cfg.r2_buckets.splice(idx, 1)
        if (cfg.r2_buckets.length === 0) delete cfg.r2_buckets
        found = true
      }
    }

    // Queue Producers
    if (cfg.queues?.producers) {
      const idx = cfg.queues.producers.findIndex(
        (b) => b.binding === bindingName
      )
      if (idx !== -1) {
        cfg.queues.producers.splice(idx, 1)
        if (cfg.queues.producers.length === 0) delete cfg.queues.producers
        if (!cfg.queues.producers && !cfg.queues.consumers) delete cfg.queues
        found = true
      }
    }

    // Durable Objects
    if (cfg.durable_objects?.bindings) {
      const idx = cfg.durable_objects.bindings.findIndex(
        (b) => b.name === bindingName
      )
      if (idx !== -1) {
        cfg.durable_objects.bindings.splice(idx, 1)
        if (cfg.durable_objects.bindings.length === 0)
          delete cfg.durable_objects
        found = true
      }
    }

    // Services
    if (cfg.services) {
      const idx = cfg.services.findIndex((b) => b.binding === bindingName)
      if (idx !== -1) {
        cfg.services.splice(idx, 1)
        if (cfg.services.length === 0) delete cfg.services
        found = true
      }
    }

    // Vars
    if (cfg.vars && bindingName in cfg.vars) {
      delete cfg.vars[bindingName]
      if (Object.keys(cfg.vars).length === 0) delete cfg.vars
      found = true
    }

    // AI
    if (cfg.ai && cfg.ai.binding === bindingName) {
      delete cfg.ai
      found = true
    }

    // Vectorize
    if (cfg.vectorize) {
      const idx = cfg.vectorize.findIndex((b) => b.binding === bindingName)
      if (idx !== -1) {
        cfg.vectorize.splice(idx, 1)
        if (cfg.vectorize.length === 0) delete cfg.vectorize
        found = true
      }
    }

    // Hyperdrive
    if (cfg.hyperdrive) {
      const idx = cfg.hyperdrive.findIndex((b) => b.binding === bindingName)
      if (idx !== -1) {
        cfg.hyperdrive.splice(idx, 1)
        if (cfg.hyperdrive.length === 0) delete cfg.hyperdrive
        found = true
      }
    }

    return found
  }

  if (env && config.env?.[env]) {
    removed = removeFromConfig(config.env[env])
  } else {
    removed = removeFromConfig(config)
  }

  if (removed) {
    writeWranglerToml(cwd, config)
  }

  return removed
}

/**
 * Check if a binding name already exists.
 */
export function bindingExists(
  config: WranglerConfig,
  bindingName: string,
  env?: string
): boolean {
  const bindings = extractBindings(config, env)
  return bindings.some((b) => b.name === bindingName)
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get a human-readable type name.
 */
export function getBindingTypeName(type: BindingType): string {
  switch (type) {
    case 'd1':
      return 'D1'
    case 'kv':
      return 'KV'
    case 'r2':
      return 'R2'
    case 'queue':
      return 'Queue'
    case 'do':
      return 'Durable Object'
    case 'service':
      return 'Service'
    case 'secret':
      return 'Secret/Var'
    case 'ai':
      return 'AI'
    case 'vectorize':
      return 'Vectorize'
    case 'hyperdrive':
      return 'Hyperdrive'
    default:
      return type
  }
}

/**
 * Truncate a string with ellipsis.
 */
export function truncateId(id: string, maxLen: number = 12): string {
  if (id.length <= maxLen) return id
  return id.slice(0, maxLen - 3) + '...'
}
