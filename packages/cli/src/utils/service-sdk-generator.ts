/**
 * @cloudwerk/cli - Service SDK Generator
 *
 * Generates TypeScript SDK for external consumption of services.
 * This allows other projects to call your services with full type safety.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ServiceEntry, ServiceManifest } from '@cloudwerk/core/build'

// ============================================================================
// Constants
// ============================================================================

const SDK_DIR = '.cloudwerk/sdk'

// ============================================================================
// Types
// ============================================================================

export interface GenerateServiceSDKOptions {
  /** Include timestamp in generated files */
  includeTimestamp?: boolean
  /** Package name for the generated SDK */
  packageName?: string
}

export interface GenerateServiceSDKResult {
  /** Path to the generated SDK directory */
  sdkDir: string
  /** Path to the generated index.ts */
  indexFile: string
  /** Path to the generated package.json */
  packageFile: string
  /** Number of services included */
  serviceCount: number
}

// ============================================================================
// SDK Generation
// ============================================================================

/**
 * Generate a TypeScript SDK for external consumption of services.
 *
 * Creates:
 * - .cloudwerk/sdk/index.ts - Main SDK with all service clients
 * - .cloudwerk/sdk/package.json - NPM package configuration
 * - .cloudwerk/sdk/tsconfig.json - TypeScript configuration
 */
export function generateServiceSDK(
  cwd: string,
  manifest: ServiceManifest,
  options: GenerateServiceSDKOptions = {}
): GenerateServiceSDKResult {
  const includeTimestamp = options.includeTimestamp ?? true
  const packageName = options.packageName ?? getDefaultPackageName(cwd)
  const sdkDir = path.join(cwd, SDK_DIR)

  // Ensure directory exists
  fs.mkdirSync(sdkDir, { recursive: true })

  // Generate index.ts
  const indexPath = path.join(sdkDir, 'index.ts')
  const indexContent = generateSDKIndex(manifest.services, packageName, includeTimestamp)
  fs.writeFileSync(indexPath, indexContent, 'utf-8')

  // Generate package.json
  const packagePath = path.join(sdkDir, 'package.json')
  const packageContent = generateSDKPackageJson(packageName)
  fs.writeFileSync(packagePath, packageContent, 'utf-8')

  // Generate tsconfig.json
  const tsconfigPath = path.join(sdkDir, 'tsconfig.json')
  const tsconfigContent = generateSDKTsconfig()
  fs.writeFileSync(tsconfigPath, tsconfigContent, 'utf-8')

  return {
    sdkDir,
    indexFile: indexPath,
    packageFile: packagePath,
    serviceCount: manifest.services.length,
  }
}

/**
 * Get default package name from project directory.
 */
function getDefaultPackageName(cwd: string): string {
  const dirName = path.basename(cwd)
  return `@${dirName}/services-sdk`
}

/**
 * Generate the SDK index.ts file.
 */
function generateSDKIndex(
  services: ServiceEntry[],
  packageName: string,
  includeTimestamp: boolean
): string {
  const lines: string[] = []

  // Header
  lines.push('// Auto-generated Service SDK - DO NOT EDIT')
  if (includeTimestamp) {
    lines.push(`// Last updated: ${new Date().toISOString()}`)
  }
  lines.push('//')
  lines.push(`// Package: ${packageName}`)
  lines.push('//')
  lines.push('// This SDK provides type-safe clients for calling your services')
  lines.push('// from external applications via Cloudflare service bindings.')
  lines.push('')

  // Imports
  lines.push("import type { Fetcher } from '@cloudflare/workers-types'")
  lines.push('')

  // Generate interfaces for each service
  lines.push('// ============================================================================')
  lines.push('// Service Interfaces')
  lines.push('// ============================================================================')
  lines.push('')

  for (const service of services) {
    const interfaceName = `${capitalizeFirst(service.name)}Service`

    lines.push(`/**`)
    lines.push(` * Interface for ${service.name} service methods.`)
    lines.push(` * Binding: ${service.bindingName}`)
    lines.push(` */`)
    lines.push(`export interface ${interfaceName} {`)

    if (service.methodNames.length > 0) {
      for (const method of service.methodNames) {
        lines.push(`  ${method}(...args: unknown[]): Promise<unknown>`)
      }
    } else {
      lines.push('  // Methods will be available after service is loaded')
      lines.push('  [key: string]: (...args: unknown[]) => Promise<unknown>')
    }

    lines.push('}')
    lines.push('')
  }

  // Generate environment interface
  lines.push('// ============================================================================')
  lines.push('// Environment Interface')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('/**')
  lines.push(' * Environment interface with all service bindings.')
  lines.push(' * Add this to your Env type to get typed access to services.')
  lines.push(' */')
  lines.push('export interface ServicesEnv {')

  for (const service of services) {
    const interfaceName = `${capitalizeFirst(service.name)}Service`
    lines.push(`  /** ${service.name} service binding */`)
    lines.push(`  ${service.bindingName}: ${interfaceName} & Fetcher`)
  }

  lines.push('}')
  lines.push('')

  // Generate client factory
  lines.push('// ============================================================================')
  lines.push('// Client Factory')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('/**')
  lines.push(' * Create a typed services client from environment bindings.')
  lines.push(' *')
  lines.push(' * @example')
  lines.push(' * ```typescript')
  lines.push(' * const services = createServicesClient(env)')
  lines.push(' * await services.email.send({ to: "user@example.com" })')
  lines.push(' * ```')
  lines.push(' */')
  lines.push('export function createServicesClient(env: ServicesEnv) {')
  lines.push('  return {')

  for (const service of services) {
    lines.push(`    ${service.name}: env.${service.bindingName},`)
  }

  lines.push('  }')
  lines.push('}')
  lines.push('')

  // Export service names for introspection
  lines.push('// ============================================================================')
  lines.push('// Service Names')
  lines.push('// ============================================================================')
  lines.push('')
  lines.push('/** All available service names */')
  lines.push(`export const serviceNames = [${services.map((s) => `'${s.name}'`).join(', ')}] as const`)
  lines.push('')
  lines.push('/** Service name type */')
  lines.push('export type ServiceName = typeof serviceNames[number]')
  lines.push('')

  // Binding name constants
  lines.push('/** Service binding name constants */')
  lines.push('export const serviceBindings = {')
  for (const service of services) {
    lines.push(`  ${service.name}: '${service.bindingName}',`)
  }
  lines.push('} as const')
  lines.push('')

  return lines.join('\n')
}

/**
 * Generate package.json for the SDK.
 */
function generateSDKPackageJson(packageName: string): string {
  const pkg = {
    name: packageName,
    version: '0.0.1',
    description: 'Generated service SDK for Cloudflare Workers',
    type: 'module',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
    files: ['dist'],
    scripts: {
      build: 'tsup index.ts --format esm --dts',
    },
    devDependencies: {
      '@cloudflare/workers-types': '^4.0.0',
      typescript: '^5.0.0',
      tsup: '^8.0.0',
    },
    peerDependencies: {
      '@cloudflare/workers-types': '^4.0.0',
    },
  }

  return JSON.stringify(pkg, null, 2)
}

/**
 * Generate tsconfig.json for the SDK.
 */
function generateSDKTsconfig(): string {
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      declaration: true,
      outDir: './dist',
    },
    include: ['*.ts'],
    exclude: ['node_modules', 'dist'],
  }

  return JSON.stringify(config, null, 2)
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if SDK exists.
 */
export function serviceSDKExists(cwd: string): boolean {
  const sdkDir = path.join(cwd, SDK_DIR)
  return fs.existsSync(sdkDir)
}

/**
 * Delete SDK directory.
 */
export function deleteServiceSDK(cwd: string): boolean {
  const sdkDir = path.join(cwd, SDK_DIR)
  if (fs.existsSync(sdkDir)) {
    fs.rmSync(sdkDir, { recursive: true, force: true })
    return true
  }
  return false
}

/**
 * Get path to SDK directory.
 */
export function getServiceSDKPath(cwd: string): string {
  return path.join(cwd, SDK_DIR)
}
