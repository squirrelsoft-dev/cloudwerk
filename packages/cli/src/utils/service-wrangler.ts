/**
 * @cloudwerk/cli - Service wrangler.toml Generator
 *
 * Generates wrangler.toml service binding configurations
 * for extracted services in app/services/.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ServiceEntry, ServiceManifest } from '@cloudwerk/core/build'
import { readWranglerTomlRaw, writeWranglerTomlRaw, findWranglerToml } from './wrangler-toml.js'

// ============================================================================
// Types
// ============================================================================

export interface GenerateServiceWranglerOptions {
  /** Dry run - don't actually write to file */
  dryRun?: boolean
  /** Include comments in generated TOML */
  includeComments?: boolean
}

export interface GenerateServiceWranglerResult {
  /** Path to wrangler.toml */
  wranglerPath: string
  /** Whether any changes were made */
  changed: boolean
  /** Services added or updated */
  services: Array<{ name: string; workerName: string; bindingName: string; mode: string }>
  /** Generated TOML snippet (for preview) */
  generatedToml: string
}

// ============================================================================
// TOML Generation
// ============================================================================

/**
 * Generate service binding TOML configuration for an extracted service.
 */
function generateServiceBindingToml(
  service: ServiceEntry,
  includeComments: boolean
): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push(`# Service binding for '${service.name}' (from app/services/${service.filePath})`)
  }
  lines.push('[[services]]')
  lines.push(`binding = "${service.bindingName}"`)
  lines.push(`service = "${service.workerName}"`)
  lines.push(`entrypoint = "${service.entrypointClass}"`)

  return lines.join('\n')
}

/**
 * Generate complete services TOML section for all extracted services.
 */
export function generateServiceToml(
  manifest: ServiceManifest,
  includeComments: boolean = true
): string {
  // Only include extracted services
  const extractedServices = manifest.services.filter((s) => s.mode === 'extracted')

  if (extractedServices.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (includeComments) {
    lines.push('# ============================================================================')
    lines.push('# Cloudwerk Services - Auto-generated from app/services/')
    lines.push('# ============================================================================')
    lines.push('#')
    lines.push('# These service bindings connect to extracted Workers.')
    lines.push('# Each service runs as a separate Worker and is called via RPC.')
    lines.push('#')
    lines.push('# To deploy extracted services, run:')
    lines.push('#   cloudwerk services deploy <name>')
    lines.push('#')
    lines.push('')
  }

  // Generate service bindings
  for (const service of extractedServices) {
    lines.push(generateServiceBindingToml(service, includeComments))
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ============================================================================
// File Operations
// ============================================================================

const SERVICE_SECTION_START = '# ============================================================================'
const SERVICE_SECTION_MARKER = '# Cloudwerk Services - Auto-generated'

/**
 * Check if wrangler.toml has an existing Cloudwerk services section.
 */
function hasServiceSection(content: string): boolean {
  return content.includes(SERVICE_SECTION_MARKER)
}

/**
 * Remove existing Cloudwerk services section from wrangler.toml content.
 */
function removeServiceSection(content: string): string {
  // Find the start of the Cloudwerk services section
  const startIndex = content.indexOf(SERVICE_SECTION_START)
  if (startIndex === -1 || !content.includes(SERVICE_SECTION_MARKER)) {
    return content
  }

  // Find the line where Cloudwerk Services section starts
  const lines = content.split('\n')
  let sectionStartLine = -1
  let sectionEndLine = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(SERVICE_SECTION_MARKER)) {
      // Find the separator line before the marker
      sectionStartLine = i > 0 && lines[i - 1].includes('===') ? i - 1 : i
      break
    }
  }

  if (sectionStartLine === -1) {
    return content
  }

  // Find the end - look for next section or end of file
  for (let i = sectionStartLine + 2; i < lines.length; i++) {
    const line = lines[i].trim()

    // Empty lines and comments are OK, continue
    if (line === '' || line.startsWith('#')) {
      continue
    }

    // If we hit [[something]] that's not services, we've reached a new section
    if (line.startsWith('[[') && !line.includes('services]]')) {
      sectionEndLine = i
      break
    }

    // If we hit [something] (single bracket) that's not services-related
    if (
      line.startsWith('[') &&
      !line.startsWith('[[') &&
      !line.includes('services')
    ) {
      sectionEndLine = i
      break
    }
  }

  // Remove the section
  const before = lines.slice(0, sectionStartLine)
  const after = lines.slice(sectionEndLine)

  // Clean up extra blank lines
  while (before.length > 0 && before[before.length - 1].trim() === '') {
    before.pop()
  }

  return [...before, '', ...after].join('\n')
}

/**
 * Generate service wrangler.toml configuration and optionally write to file.
 */
export function generateServiceWrangler(
  cwd: string,
  manifest: ServiceManifest,
  options: GenerateServiceWranglerOptions = {}
): GenerateServiceWranglerResult {
  const { dryRun = false, includeComments = true } = options

  const wranglerPath = findWranglerToml(cwd) || path.join(cwd, 'wrangler.toml')
  const generatedToml = generateServiceToml(manifest, includeComments)

  const extractedServices = manifest.services.filter((s) => s.mode === 'extracted')

  const result: GenerateServiceWranglerResult = {
    wranglerPath,
    changed: false,
    services: extractedServices.map((s) => ({
      name: s.name,
      workerName: s.workerName,
      bindingName: s.bindingName,
      mode: s.mode,
    })),
    generatedToml,
  }

  if (extractedServices.length === 0) {
    return result
  }

  if (dryRun) {
    result.changed = true
    return result
  }

  // Read existing content
  let content = ''
  if (fs.existsSync(wranglerPath)) {
    content = readWranglerTomlRaw(cwd)
  }

  // Remove existing Cloudwerk services section if present
  if (hasServiceSection(content)) {
    content = removeServiceSection(content)
  }

  // Append new services configuration
  const newContent = content.trim() + '\n\n' + generatedToml + '\n'

  // Write the file
  writeWranglerTomlRaw(cwd, newContent)
  result.changed = true

  return result
}

/**
 * Remove Cloudwerk services configuration from wrangler.toml.
 */
export function removeServiceWrangler(cwd: string): boolean {
  const wranglerPath = findWranglerToml(cwd)
  if (!wranglerPath) {
    return false
  }

  const content = readWranglerTomlRaw(cwd)
  if (!hasServiceSection(content)) {
    return false
  }

  const newContent = removeServiceSection(content)
  writeWranglerTomlRaw(cwd, newContent)
  return true
}

/**
 * Check if a specific service is configured in wrangler.toml.
 */
export function hasServiceInWrangler(cwd: string, serviceName: string): boolean {
  const wranglerPath = findWranglerToml(cwd)
  if (!wranglerPath) {
    return false
  }

  const content = readWranglerTomlRaw(cwd)
  const bindingPattern = new RegExp(`binding\\s*=\\s*["']${serviceName.toUpperCase()}_SERVICE["']`)
  return bindingPattern.test(content)
}
