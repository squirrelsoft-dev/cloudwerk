/**
 * End-to-End Spike Validation Tests
 *
 * Validates the complete Cloudwerk spike flow:
 * scaffold -> install -> dev server -> HTTP request -> correct response
 *
 * This is the final validation step before v0.1.0 milestone completion.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { type ChildProcess } from 'node:child_process'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

import {
  findAvailablePort,
  startServer,
  stopServer,
  waitForServer,
  runCommand,
} from './utils/server-utils.js'

// ============================================================================
// Constants
// ============================================================================

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const MONOREPO_ROOT = resolve(__dirname, '..')

// ============================================================================
// Test Suite
// ============================================================================

describe('End-to-End Spike Validation', () => {
  let tempDir: string
  let projectDir: string
  let serverProcess: ChildProcess | null = null
  let port: number

  // ==========================================================================
  // Setup: Scaffold project, link packages, install deps, start server
  // ==========================================================================

  beforeAll(async () => {
    // 1. Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'cloudwerk-e2e-'))
    projectDir = join(tempDir, 'test-app')

    console.log(`[E2E] Temp directory: ${tempDir}`)
    console.log(`[E2E] Project directory: ${projectDir}`)

    // 2. Pack local packages to tarballs (resolves workspace: protocol)
    console.log('[E2E] Packing local packages...')
    const tarballs = await packLocalPackages(tempDir)

    // 3. Scaffold project programmatically
    const scaffoldPath = join(MONOREPO_ROOT, 'apps/create-cloudwerk-app/src/scaffold.ts')
    const { scaffold } = await import(scaffoldPath)

    console.log('[E2E] Scaffolding project...')
    // Use 'none' renderer for API-only template to test JSON endpoints
    await scaffold('test-app', { targetDir: projectDir, renderer: 'none' })

    // 4. Patch package.json to use tarball references
    console.log('[E2E] Patching package.json for local packages...')
    await patchPackageJson(projectDir, tarballs)

    // 5. Install dependencies
    console.log('[E2E] Installing dependencies...')
    await runCommand('pnpm', ['install'], { cwd: projectDir })

    // 6. Find available port and start dev server
    port = await findAvailablePort(3000, 3999)
    console.log(`[E2E] Starting dev server on port ${port}...`)

    serverProcess = startServer(projectDir, port)

    // 7. Wait for server to be ready
    console.log('[E2E] Waiting for server to be ready...')
    await waitForServer(`http://localhost:${port}`, 15000)
    console.log('[E2E] Server is ready!')
  }, 120000) // 120 second timeout for setup (packing takes time)

  // ==========================================================================
  // Teardown: Stop server, cleanup temp directory
  // ==========================================================================

  afterAll(async () => {
    // Stop server
    if (serverProcess) {
      console.log('[E2E] Stopping server...')
      await stopServer(serverProcess)
      serverProcess = null
    }

    // Cleanup temp directory
    if (tempDir) {
      console.log('[E2E] Cleaning up temp directory...')
      await rm(tempDir, { recursive: true, force: true })
    }
  }, 10000) // 10 second timeout for teardown

  // ==========================================================================
  // Test Cases
  // ==========================================================================

  it('GET / returns { message: "Hello Cloudwerk" }', async () => {
    const response = await fetch(`http://localhost:${port}/`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const data = await response.json()
    expect(data).toEqual({ message: 'Hello Cloudwerk' })
  })

  it('GET /unknown returns 404', async () => {
    const response = await fetch(`http://localhost:${port}/unknown`)

    expect(response.status).toBe(404)
  })

  it('server responds to multiple requests', async () => {
    // Verify server can handle multiple sequential requests
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`http://localhost:${port}/`)
      expect(response.status).toBe(200)
    }
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

interface Tarballs {
  core: string
  cli: string
  ui: string
  vitePlugin: string
}

/**
 * Pack local packages to tarballs.
 * This resolves workspace:* dependencies so they work outside the monorepo.
 */
async function packLocalPackages(targetDir: string): Promise<Tarballs> {
  const packagesDir = join(targetDir, 'packages')
  await mkdir(packagesDir, { recursive: true })

  // Pack @cloudwerk/core first (cli and ui depend on it)
  console.log('[E2E] Packing @cloudwerk/core...')
  await runCommand('pnpm', ['pack', '--pack-destination', packagesDir], {
    cwd: join(MONOREPO_ROOT, 'packages/core'),
  })

  // Pack @cloudwerk/ui (cli depends on it)
  console.log('[E2E] Packing @cloudwerk/ui...')
  await runCommand('pnpm', ['pack', '--pack-destination', packagesDir], {
    cwd: join(MONOREPO_ROOT, 'packages/ui'),
  })

  // Pack @cloudwerk/vite-plugin (cli depends on it)
  console.log('[E2E] Packing @cloudwerk/vite-plugin...')
  await runCommand('pnpm', ['pack', '--pack-destination', packagesDir], {
    cwd: join(MONOREPO_ROOT, 'packages/vite-plugin'),
  })

  // Pack @cloudwerk/cli
  console.log('[E2E] Packing @cloudwerk/cli...')
  await runCommand('pnpm', ['pack', '--pack-destination', packagesDir], {
    cwd: join(MONOREPO_ROOT, 'packages/cli'),
  })

  // Read package versions dynamically
  const corePackageJson = JSON.parse(
    await readFile(join(MONOREPO_ROOT, 'packages/core/package.json'), 'utf-8')
  )
  const uiPackageJson = JSON.parse(
    await readFile(join(MONOREPO_ROOT, 'packages/ui/package.json'), 'utf-8')
  )
  const vitePluginPackageJson = JSON.parse(
    await readFile(join(MONOREPO_ROOT, 'packages/vite-plugin/package.json'), 'utf-8')
  )
  const cliPackageJson = JSON.parse(
    await readFile(join(MONOREPO_ROOT, 'packages/cli/package.json'), 'utf-8')
  )

  // Find the tarball paths using dynamic versions
  const coreTarball = join(packagesDir, `cloudwerk-core-${corePackageJson.version}.tgz`)
  const uiTarball = join(packagesDir, `cloudwerk-ui-${uiPackageJson.version}.tgz`)
  const vitePluginTarball = join(packagesDir, `cloudwerk-vite-plugin-${vitePluginPackageJson.version}.tgz`)
  const cliTarball = join(packagesDir, `cloudwerk-cli-${cliPackageJson.version}.tgz`)

  if (!existsSync(coreTarball)) {
    throw new Error(`Core tarball not found at ${coreTarball}`)
  }
  if (!existsSync(uiTarball)) {
    throw new Error(`UI tarball not found at ${uiTarball}`)
  }
  if (!existsSync(vitePluginTarball)) {
    throw new Error(`Vite plugin tarball not found at ${vitePluginTarball}`)
  }
  if (!existsSync(cliTarball)) {
    throw new Error(`CLI tarball not found at ${cliTarball}`)
  }

  return {
    core: coreTarball,
    ui: uiTarball,
    vitePlugin: vitePluginTarball,
    cli: cliTarball,
  }
}

/**
 * Patch the scaffolded project's package.json to use local tarball references
 * instead of npm registry versions.
 *
 * Uses pnpm.overrides to also redirect transitive @cloudwerk/core dependency
 * from the CLI package to the local tarball.
 */
async function patchPackageJson(projectDir: string, tarballs: Tarballs): Promise<void> {
  const packageJsonPath = join(projectDir, 'package.json')
  const content = await readFile(packageJsonPath, 'utf-8')
  const pkg = JSON.parse(content)

  // Update direct dependencies to use local tarballs
  if (pkg.dependencies) {
    pkg.dependencies['@cloudwerk/core'] = `file:${tarballs.core}`
    pkg.dependencies['@cloudwerk/cli'] = `file:${tarballs.cli}`
    pkg.dependencies['@cloudwerk/ui'] = `file:${tarballs.ui}`
  }

  // Add pnpm overrides to redirect transitive dependencies
  // This ensures @cloudwerk/cli's dependencies also resolve to local tarballs
  pkg.pnpm = pkg.pnpm || {}
  pkg.pnpm.overrides = pkg.pnpm.overrides || {}
  pkg.pnpm.overrides['@cloudwerk/core'] = `file:${tarballs.core}`
  pkg.pnpm.overrides['@cloudwerk/ui'] = `file:${tarballs.ui}`
  pkg.pnpm.overrides['@cloudwerk/vite-plugin'] = `file:${tarballs.vitePlugin}`

  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}
