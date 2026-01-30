/**
 * @cloudwerk/vite-plugin - Wrangler TOML Watcher Utilities
 *
 * Utilities for watching wrangler.toml and regenerating .cloudwerk/types/
 * when bindings change during development.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ============================================================================
// Types
// ============================================================================

type BindingType =
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

interface Binding {
  type: BindingType
  name: string
}

interface WranglerConfig {
  d1_databases?: Array<{ binding: string }>
  kv_namespaces?: Array<{ binding: string }>
  r2_buckets?: Array<{ binding: string }>
  queues?: { producers?: Array<{ binding: string }> }
  durable_objects?: { bindings?: Array<{ name: string }> }
  services?: Array<{ binding: string }>
  vars?: Record<string, string>
  ai?: { binding: string }
  vectorize?: Array<{ binding: string }>
  hyperdrive?: Array<{ binding: string }>
}

interface RegenerateResult {
  bindingCount: number
  files: {
    bindings: string
    context: string
  }
}

// ============================================================================
// Type Mappings
// ============================================================================

const TYPE_MAPPINGS: Record<BindingType, string> = {
  d1: 'D1Database',
  kv: 'KVNamespace',
  r2: 'R2Bucket',
  queue: 'Queue',
  do: 'DurableObjectNamespace',
  service: 'Fetcher',
  secret: 'string',
  ai: 'Ai',
  vectorize: 'VectorizeIndex',
  hyperdrive: 'Hyperdrive',
}

// ============================================================================
// TOML Parsing (simplified)
// ============================================================================

/**
 * Parse a simplified subset of TOML for binding extraction.
 * This is a lightweight parser that handles the common wrangler.toml patterns.
 */
function parseSimpleToml(content: string): WranglerConfig {
  const result: WranglerConfig = {}

  // Simple regex-based extraction for arrays of tables
  // D1 databases: [[d1_databases]]
  const d1Matches = content.matchAll(/\[\[d1_databases\]\]\s*\n([^[]*)/g)
  for (const match of d1Matches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.d1_databases) result.d1_databases = []
      result.d1_databases.push({ binding: bindingMatch[1] })
    }
  }

  // KV namespaces: [[kv_namespaces]]
  const kvMatches = content.matchAll(/\[\[kv_namespaces\]\]\s*\n([^[]*)/g)
  for (const match of kvMatches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.kv_namespaces) result.kv_namespaces = []
      result.kv_namespaces.push({ binding: bindingMatch[1] })
    }
  }

  // R2 buckets: [[r2_buckets]]
  const r2Matches = content.matchAll(/\[\[r2_buckets\]\]\s*\n([^[]*)/g)
  for (const match of r2Matches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.r2_buckets) result.r2_buckets = []
      result.r2_buckets.push({ binding: bindingMatch[1] })
    }
  }

  // Queue producers: [[queues.producers]]
  const queueMatches = content.matchAll(/\[\[queues\.producers\]\]\s*\n([^[]*)/g)
  for (const match of queueMatches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.queues) result.queues = {}
      if (!result.queues.producers) result.queues.producers = []
      result.queues.producers.push({ binding: bindingMatch[1] })
    }
  }

  // Durable objects: [[durable_objects.bindings]]
  const doMatches = content.matchAll(/\[\[durable_objects\.bindings\]\]\s*\n([^[]*)/g)
  for (const match of doMatches) {
    const nameMatch = match[1].match(/name\s*=\s*["']([^"']+)["']/)
    if (nameMatch) {
      if (!result.durable_objects) result.durable_objects = {}
      if (!result.durable_objects.bindings) result.durable_objects.bindings = []
      result.durable_objects.bindings.push({ name: nameMatch[1] })
    }
  }

  // Services: [[services]]
  const serviceMatches = content.matchAll(/\[\[services\]\]\s*\n([^[]*)/g)
  for (const match of serviceMatches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.services) result.services = []
      result.services.push({ binding: bindingMatch[1] })
    }
  }

  // Vars: [vars] section
  const varsMatch = content.match(/\[vars\]\s*\n([^[]*)/s)
  if (varsMatch) {
    const varsSection = varsMatch[1]
    const varMatches = varsSection.matchAll(/(\w+)\s*=\s*["']([^"']*)["']/g)
    result.vars = {}
    for (const match of varMatches) {
      result.vars[match[1]] = match[2]
    }
  }

  // AI binding: [ai]
  const aiMatch = content.match(/\[ai\]\s*\n([^[]*)/s)
  if (aiMatch) {
    const bindingMatch = aiMatch[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      result.ai = { binding: bindingMatch[1] }
    }
  }

  // Vectorize: [[vectorize]]
  const vectorizeMatches = content.matchAll(/\[\[vectorize\]\]\s*\n([^[]*)/g)
  for (const match of vectorizeMatches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.vectorize) result.vectorize = []
      result.vectorize.push({ binding: bindingMatch[1] })
    }
  }

  // Hyperdrive: [[hyperdrive]]
  const hyperdriveMatches = content.matchAll(/\[\[hyperdrive\]\]\s*\n([^[]*)/g)
  for (const match of hyperdriveMatches) {
    const bindingMatch = match[1].match(/binding\s*=\s*["']([^"']+)["']/)
    if (bindingMatch) {
      if (!result.hyperdrive) result.hyperdrive = []
      result.hyperdrive.push({ binding: bindingMatch[1] })
    }
  }

  return result
}

// ============================================================================
// Binding Extraction
// ============================================================================

function extractBindings(config: WranglerConfig): Binding[] {
  const bindings: Binding[] = []

  if (config.d1_databases) {
    for (const db of config.d1_databases) {
      bindings.push({ type: 'd1', name: db.binding })
    }
  }

  if (config.kv_namespaces) {
    for (const kv of config.kv_namespaces) {
      bindings.push({ type: 'kv', name: kv.binding })
    }
  }

  if (config.r2_buckets) {
    for (const r2 of config.r2_buckets) {
      bindings.push({ type: 'r2', name: r2.binding })
    }
  }

  if (config.queues?.producers) {
    for (const queue of config.queues.producers) {
      bindings.push({ type: 'queue', name: queue.binding })
    }
  }

  if (config.durable_objects?.bindings) {
    for (const doBinding of config.durable_objects.bindings) {
      bindings.push({ type: 'do', name: doBinding.name })
    }
  }

  if (config.services) {
    for (const service of config.services) {
      bindings.push({ type: 'service', name: service.binding })
    }
  }

  if (config.vars) {
    for (const name of Object.keys(config.vars)) {
      bindings.push({ type: 'secret', name })
    }
  }

  if (config.ai) {
    bindings.push({ type: 'ai', name: config.ai.binding })
  }

  if (config.vectorize) {
    for (const vec of config.vectorize) {
      bindings.push({ type: 'vectorize', name: vec.binding })
    }
  }

  if (config.hyperdrive) {
    for (const hd of config.hyperdrive) {
      bindings.push({ type: 'hyperdrive', name: hd.binding })
    }
  }

  return bindings
}

// ============================================================================
// Type Generation
// ============================================================================

function getSectionName(type: BindingType): string {
  switch (type) {
    case 'd1':
      return 'D1 Databases'
    case 'kv':
      return 'KV Namespaces'
    case 'r2':
      return 'R2 Buckets'
    case 'queue':
      return 'Queues'
    case 'do':
      return 'Durable Objects'
    case 'service':
      return 'Services'
    case 'secret':
      return 'Environment Variables'
    case 'ai':
      return 'AI'
    case 'vectorize':
      return 'Vectorize Indexes'
    case 'hyperdrive':
      return 'Hyperdrive'
    default:
      return 'Other'
  }
}

function groupBindingsByType(bindings: Binding[]): Map<BindingType, Binding[]> {
  const grouped = new Map<BindingType, Binding[]>()
  for (const binding of bindings) {
    const existing = grouped.get(binding.type) || []
    existing.push(binding)
    grouped.set(binding.type, existing)
  }
  return grouped
}

function generateBindingsDts(bindings: Binding[]): string {
  const lines: string[] = []

  lines.push('// Auto-generated by cloudwerk - DO NOT EDIT')
  lines.push(`// Last updated: ${new Date().toISOString()}`)
  lines.push('//')
  lines.push('// This file provides type information for @cloudwerk/core/bindings')
  lines.push('')
  lines.push("declare module '@cloudwerk/core/bindings' {")

  const bindingsByType = groupBindingsByType(bindings)
  const typeOrder: BindingType[] = [
    'd1', 'kv', 'r2', 'queue', 'do', 'service', 'ai', 'vectorize', 'hyperdrive', 'secret',
  ]

  let firstSection = true
  for (const type of typeOrder) {
    const typeBindings = bindingsByType.get(type)
    if (!typeBindings || typeBindings.length === 0) continue

    const tsType = TYPE_MAPPINGS[type]
    const sectionName = getSectionName(type)

    if (!firstSection) {
      lines.push('')
    }
    lines.push(`  // ${sectionName}`)
    firstSection = false

    for (const binding of typeBindings) {
      lines.push(`  export const ${binding.name}: ${tsType}`)
    }
  }

  lines.push('')
  lines.push('  // Bindings proxy object (for dynamic access)')
  lines.push('  export const bindings: Record<string, unknown>')
  lines.push('')
  lines.push('  // Helper functions')
  lines.push('  export function getBinding<T = unknown>(name: string): T')
  lines.push('  export function hasBinding(name: string): boolean')
  lines.push('  export function getBindingNames(): string[]')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

function generateContextDts(bindings: Binding[]): string {
  const lines: string[] = []

  lines.push('// Auto-generated by cloudwerk - DO NOT EDIT')
  lines.push(`// Last updated: ${new Date().toISOString()}`)
  lines.push('//')
  lines.push('// This file provides type information for @cloudwerk/core/context')
  lines.push('')
  lines.push('interface CloudwerkEnv {')

  const bindingsByType = groupBindingsByType(bindings)
  const typeOrder: BindingType[] = [
    'd1', 'kv', 'r2', 'queue', 'do', 'service', 'ai', 'vectorize', 'hyperdrive', 'secret',
  ]

  let firstSection = true
  for (const type of typeOrder) {
    const typeBindings = bindingsByType.get(type)
    if (!typeBindings || typeBindings.length === 0) continue

    const tsType = TYPE_MAPPINGS[type]
    const sectionName = getSectionName(type)

    if (!firstSection) {
      lines.push('')
    }
    lines.push(`  // ${sectionName}`)
    firstSection = false

    for (const binding of typeBindings) {
      lines.push(`  ${binding.name}: ${tsType}`)
    }
  }

  lines.push('}')
  lines.push('')
  lines.push("declare module '@cloudwerk/core/context' {")
  lines.push('  export const params: Record<string, string>')
  lines.push('  export const request: Request')
  lines.push('  export const env: CloudwerkEnv')
  lines.push('  export const executionCtx: {')
  lines.push('    waitUntil(promise: Promise<unknown>): void')
  lines.push('    passThroughOnException(): void')
  lines.push('  }')
  lines.push('  export function getRequestId(): string')
  lines.push('  export function get<T>(key: string): T | undefined')
  lines.push('  export function set<T>(key: string, value: T): void')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Find the path to wrangler.toml or wrangler.json in the project root.
 */
export function findWranglerTomlPath(root: string): string | null {
  const tomlPath = path.join(root, 'wrangler.toml')
  if (fs.existsSync(tomlPath)) {
    return tomlPath
  }

  const jsonPath = path.join(root, 'wrangler.json')
  if (fs.existsSync(jsonPath)) {
    return jsonPath
  }

  return null
}

/**
 * Regenerate .cloudwerk/types/ from wrangler.toml.
 *
 * This is called when wrangler.toml changes during development.
 * Returns null if wrangler.toml doesn't exist or has no bindings.
 */
export function regenerateCloudwerkTypes(root: string): RegenerateResult | null {
  const wranglerPath = findWranglerTomlPath(root)
  if (!wranglerPath) {
    return null
  }

  // Read and parse wrangler config
  const content = fs.readFileSync(wranglerPath, 'utf-8')
  let config: WranglerConfig

  if (wranglerPath.endsWith('.json')) {
    config = JSON.parse(content) as WranglerConfig
  } else {
    config = parseSimpleToml(content)
  }

  // Extract bindings
  const bindings = extractBindings(config)
  if (bindings.length === 0) {
    return null
  }

  // Create .cloudwerk/types/ directory
  const typesDir = path.join(root, '.cloudwerk', 'types')
  fs.mkdirSync(typesDir, { recursive: true })

  // Generate and write bindings.d.ts
  const bindingsPath = path.join(typesDir, 'bindings.d.ts')
  const bindingsContent = generateBindingsDts(bindings)
  fs.writeFileSync(bindingsPath, bindingsContent, 'utf-8')

  // Generate and write context.d.ts
  const contextPath = path.join(typesDir, 'context.d.ts')
  const contextContent = generateContextDts(bindings)
  fs.writeFileSync(contextPath, contextContent, 'utf-8')

  return {
    bindingCount: bindings.length,
    files: {
      bindings: bindingsPath,
      context: contextPath,
    },
  }
}
