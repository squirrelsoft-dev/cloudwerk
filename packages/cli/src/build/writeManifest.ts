/**
 * @cloudwerk/cli - Build Manifest Writer
 *
 * Writes a build manifest with metadata about the build output.
 * This manifest can be used by deployment tools and for debugging.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ClientBundleResult, ServerBundleResult } from '../types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Build manifest structure written to disk.
 */
export interface BuildManifest {
  /** Build version (from package.json or timestamp) */
  version: string
  /** Build timestamp (ISO 8601) */
  buildTime: string
  /** Build duration in milliseconds */
  buildDuration: number
  /** Client bundle information */
  client: {
    /** Path to runtime bundle */
    runtimePath: string
    /** Runtime bundle size in bytes */
    runtimeSize: number
    /** Number of component bundles */
    componentCount: number
    /** Total size of all component bundles in bytes */
    componentsSize: number
    /** Total client bundle size in bytes */
    totalSize: number
    /** List of component IDs */
    components: string[]
  }
  /** Server bundle information */
  server: {
    /** Path to server bundle */
    outputPath: string
    /** Server bundle size in bytes */
    size: number
    /** Compressed size in bytes */
    compressedSize: number
  }
  /** SSG information (if enabled) */
  ssg?: {
    /** Number of static pages generated */
    pageCount: number
    /** List of static page paths */
    pages: string[]
  }
  /** Output directory */
  outputDir: string
}

/**
 * Options for writing the build manifest.
 */
export interface WriteManifestOptions {
  /** Output directory */
  outputDir: string
  /** Client bundle result */
  clientResult: ClientBundleResult
  /** Server bundle result */
  serverResult: ServerBundleResult
  /** SSG output paths (if --ssg was used) */
  staticPages?: string[]
  /** Build duration in milliseconds */
  buildDuration: number
  /** Package version (optional) */
  version?: string
}

// ============================================================================
// Constants
// ============================================================================

/** Build manifest file name */
const MANIFEST_FILE = 'build-manifest.json'

// ============================================================================
// Manifest Writing
// ============================================================================

/**
 * Write the build manifest to disk.
 *
 * The manifest contains information about the build output that can be
 * used by deployment tools, CI/CD pipelines, or for debugging.
 *
 * @param options - Manifest options
 * @returns Path to the written manifest file
 *
 * @example
 * ```typescript
 * const manifestPath = await writeManifest({
 *   outputDir: './dist',
 *   clientResult,
 *   serverResult,
 *   buildDuration: 1500,
 * })
 * ```
 */
export async function writeManifest(
  options: WriteManifestOptions
): Promise<string> {
  const {
    outputDir,
    clientResult,
    serverResult,
    staticPages,
    buildDuration,
    version = new Date().toISOString().slice(0, 10),
  } = options

  const manifest: BuildManifest = {
    version,
    buildTime: new Date().toISOString(),
    buildDuration,
    client: {
      runtimePath: path.relative(outputDir, clientResult.runtimePath),
      runtimeSize: clientResult.runtimeSize,
      componentCount: clientResult.componentBundles.size,
      componentsSize: clientResult.totalSize - clientResult.runtimeSize,
      totalSize: clientResult.totalSize,
      components: Array.from(clientResult.componentBundles.keys()),
    },
    server: {
      outputPath: path.relative(outputDir, serverResult.outputPath),
      size: serverResult.size,
      compressedSize: serverResult.compressedSize ?? serverResult.size,
    },
    outputDir,
  }

  // Add SSG info if present
  if (staticPages && staticPages.length > 0) {
    manifest.ssg = {
      pageCount: staticPages.length,
      pages: staticPages.map(p => path.relative(outputDir, p)),
    }
  }

  const manifestPath = path.join(outputDir, MANIFEST_FILE)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  return manifestPath
}

/**
 * Read a build manifest from disk.
 *
 * @param outputDir - Output directory containing the manifest
 * @returns Build manifest or null if not found
 */
export function readManifest(outputDir: string): BuildManifest | null {
  const manifestPath = path.join(outputDir, MANIFEST_FILE)

  if (!fs.existsSync(manifestPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    return JSON.parse(content) as BuildManifest
  } catch {
    return null
  }
}

/**
 * Format build manifest for console output.
 *
 * @param manifest - Build manifest
 * @returns Formatted string for display
 */
export function formatManifest(manifest: BuildManifest): string {
  const lines: string[] = [
    'Build Summary:',
    `  Version: ${manifest.version}`,
    `  Build Time: ${manifest.buildTime}`,
    `  Duration: ${manifest.buildDuration}ms`,
    '',
    'Client Bundles:',
    `  Runtime: ${formatSize(manifest.client.runtimeSize)}`,
    `  Components: ${manifest.client.componentCount} (${formatSize(manifest.client.componentsSize)})`,
    `  Total: ${formatSize(manifest.client.totalSize)}`,
    '',
    'Server Bundle:',
    `  Size: ${formatSize(manifest.server.size)}`,
    `  Compressed: ${formatSize(manifest.server.compressedSize)}`,
  ]

  if (manifest.ssg) {
    lines.push('')
    lines.push('Static Pages:')
    lines.push(`  Count: ${manifest.ssg.pageCount}`)
  }

  return lines.join('\n')
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format a byte size for human-readable display.
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "14.2 KB")
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
