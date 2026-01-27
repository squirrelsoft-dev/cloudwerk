/**
 * create-cloudwerk-app - Scaffold Tests
 *
 * Tests for validation and scaffolding functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'node:path'
import fs from 'fs-extra'
import os from 'node:os'
import {
  validateProjectName,
  validateDirectory,
  validateProject,
} from '../validate.js'
import { detectPackageManager, getInstallCommand, getDevCommand } from '../utils.js'
import { isInteractiveMode, type RendererChoice } from '../prompts.js'

// ============================================================================
// validateProjectName Tests
// ============================================================================

describe('validateProjectName', () => {
  describe('valid names', () => {
    it('should accept simple lowercase name', () => {
      const result = validateProjectName('my-app')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept name with numbers', () => {
      const result = validateProjectName('app123')
      expect(result.valid).toBe(true)
    })

    it('should accept scoped package name', () => {
      const result = validateProjectName('@scope/my-app')
      expect(result.valid).toBe(true)
    })

    it('should accept name with dots', () => {
      const result = validateProjectName('my.app')
      expect(result.valid).toBe(true)
    })

    it('should accept name with underscores', () => {
      const result = validateProjectName('my_app')
      expect(result.valid).toBe(true)
    })

    it('should accept name starting with number', () => {
      const result = validateProjectName('123app')
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid names', () => {
    it('should reject empty name', () => {
      const result = validateProjectName('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject whitespace-only name', () => {
      const result = validateProjectName('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject uppercase letters', () => {
      const result = validateProjectName('MY_APP')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('lowercase')
    })

    it('should reject mixed case', () => {
      const result = validateProjectName('MyApp')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('lowercase')
    })

    it('should reject path traversal with ..', () => {
      const result = validateProjectName('..')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject path traversal with ../', () => {
      const result = validateProjectName('../hack')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject absolute paths', () => {
      const result = validateProjectName('/etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject backslash paths', () => {
      const result = validateProjectName('foo\\bar')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject scoped package with path traversal', () => {
      const result = validateProjectName('@scope/../../../etc')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject fake scoped package starting with @ but with traversal', () => {
      const result = validateProjectName('@../../malicious')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject scoped package with multiple slashes', () => {
      const result = validateProjectName('@scope/name/../../etc')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('path traversal')
    })

    it('should reject names with spaces', () => {
      const result = validateProjectName('invalid name')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('valid npm package name')
    })

    it('should reject reserved name node_modules', () => {
      const result = validateProjectName('node_modules')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('reserved')
    })

    it('should reject reserved name .git', () => {
      const result = validateProjectName('.git')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('reserved')
    })
  })
})

// ============================================================================
// validateDirectory Tests
// ============================================================================

describe('validateDirectory', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudwerk-test-'))
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  it('should accept non-existent directory', () => {
    const dirPath = path.join(tempDir, 'new-project')
    const result = validateDirectory(dirPath)
    expect(result.valid).toBe(true)
  })

  it('should accept empty existing directory', async () => {
    const dirPath = path.join(tempDir, 'empty-dir')
    await fs.mkdir(dirPath)

    const result = validateDirectory(dirPath)
    expect(result.valid).toBe(true)
  })

  it('should reject non-empty directory', async () => {
    const dirPath = path.join(tempDir, 'non-empty')
    await fs.mkdir(dirPath)
    await fs.writeFile(path.join(dirPath, 'file.txt'), 'content')

    const result = validateDirectory(dirPath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('already exists')
    expect(result.error).toContain('not empty')
  })

  it('should reject existing file', async () => {
    const filePath = path.join(tempDir, 'existing-file')
    await fs.writeFile(filePath, 'content')

    const result = validateDirectory(filePath)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not a directory')
  })
})

// ============================================================================
// validateProject Tests
// ============================================================================

describe('validateProject', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudwerk-test-'))
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  it('should validate both name and directory', () => {
    const projectName = 'my-project'
    const targetDir = path.join(tempDir, projectName)

    const result = validateProject(projectName, targetDir)
    expect(result.valid).toBe(true)
  })

  it('should fail if name is invalid', () => {
    const projectName = 'INVALID_NAME'
    const targetDir = path.join(tempDir, 'valid-dir')

    const result = validateProject(projectName, targetDir)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('lowercase')
  })

  it('should fail if directory exists and is not empty', async () => {
    const projectName = 'my-project'
    const targetDir = path.join(tempDir, projectName)
    await fs.mkdir(targetDir)
    await fs.writeFile(path.join(targetDir, 'file.txt'), 'content')

    const result = validateProject(projectName, targetDir)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('already exists')
  })
})

// ============================================================================
// Package Manager Detection Tests
// ============================================================================

describe('detectPackageManager', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should detect npm', () => {
    process.env.npm_config_user_agent = 'npm/10.0.0 node/v20.0.0'
    expect(detectPackageManager()).toBe('npm')
  })

  it('should detect yarn', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.0 npm/? node/v20.0.0'
    expect(detectPackageManager()).toBe('yarn')
  })

  it('should detect pnpm', () => {
    process.env.npm_config_user_agent = 'pnpm/8.0.0 npm/? node/v20.0.0'
    expect(detectPackageManager()).toBe('pnpm')
  })

  it('should detect bun', () => {
    process.env.npm_config_user_agent = 'bun/1.0.0'
    expect(detectPackageManager()).toBe('bun')
  })

  it('should default to npm when no user agent', () => {
    delete process.env.npm_config_user_agent
    delete process.env.USER_AGENT
    expect(detectPackageManager()).toBe('npm')
  })
})

describe('getInstallCommand', () => {
  it('should return npm install for npm', () => {
    expect(getInstallCommand('npm')).toBe('npm install')
  })

  it('should return yarn for yarn', () => {
    expect(getInstallCommand('yarn')).toBe('yarn')
  })

  it('should return pnpm install for pnpm', () => {
    expect(getInstallCommand('pnpm')).toBe('pnpm install')
  })

  it('should return bun install for bun', () => {
    expect(getInstallCommand('bun')).toBe('bun install')
  })
})

describe('getDevCommand', () => {
  it('should return npm run dev for npm', () => {
    expect(getDevCommand('npm')).toBe('npm run dev')
  })

  it('should return yarn dev for yarn', () => {
    expect(getDevCommand('yarn')).toBe('yarn dev')
  })

  it('should return pnpm dev for pnpm', () => {
    expect(getDevCommand('pnpm')).toBe('pnpm dev')
  })

  it('should return bun dev for bun', () => {
    expect(getDevCommand('bun')).toBe('bun dev')
  })
})

// ============================================================================
// Scaffolding Integration Tests
// ============================================================================

describe('scaffold integration', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudwerk-scaffold-test-'))
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  // Dynamic import of scaffold to allow proper mocking of process.exit
  const importScaffold = async () => {
    const module = await import('../scaffold.js')
    return module.scaffold
  }

  it('should create project directory with all files', async () => {
    // Mock console.log to suppress output
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'test-project'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir })

    // Verify files were created
    expect(fs.existsSync(targetDir)).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, '.gitignore'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'cloudwerk.config.ts'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'tsconfig.json'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'wrangler.toml'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'app', 'routes', 'route.ts'))).toBe(true)

    // Verify package.json has correct name
    const pkgJson = await fs.readJson(path.join(targetDir, 'package.json'))
    expect(pkgJson.name).toBe(projectName)

    // Verify wrangler.toml has correct name
    const wranglerToml = await fs.readFile(
      path.join(targetDir, 'wrangler.toml'),
      'utf-8'
    )
    expect(wranglerToml).toContain(`name = "${projectName}"`)

    mockLog.mockRestore()
  })

  it('should replace placeholders in template files', async () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'my-custom-app'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir })

    // Verify placeholders are replaced
    const pkgJson = await fs.readJson(path.join(targetDir, 'package.json'))
    expect(pkgJson.name).toBe('my-custom-app')
    // Verify cloudwerk dependencies use semver with caret
    expect(pkgJson.dependencies['@cloudwerk/core']).toMatch(/^\^\d+\.\d+\.\d+$/)
    expect(pkgJson.dependencies['@cloudwerk/cli']).toMatch(/^\^\d+\.\d+\.\d+$/)

    mockLog.mockRestore()
  })

  it('should rename _gitignore to .gitignore', async () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'gitignore-test'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir })

    // .gitignore should exist, _gitignore should not
    expect(fs.existsSync(path.join(targetDir, '.gitignore'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, '_gitignore'))).toBe(false)

    // Verify .gitignore content
    const gitignore = await fs.readFile(
      path.join(targetDir, '.gitignore'),
      'utf-8'
    )
    expect(gitignore).toContain('node_modules/')
    expect(gitignore).toContain('dist/')

    mockLog.mockRestore()
  })

  it('should throw error for invalid project name', async () => {
    const scaffold = await importScaffold()
    const projectName = 'INVALID_NAME'
    const targetDir = path.join(tempDir, projectName)

    await expect(scaffold(projectName, { targetDir })).rejects.toThrow('lowercase')
  })

  it('should throw error for non-empty target directory', async () => {
    const scaffold = await importScaffold()
    const projectName = 'existing-project'
    const targetDir = path.join(tempDir, projectName)

    // Create non-empty directory
    await fs.mkdir(targetDir)
    await fs.writeFile(path.join(targetDir, 'file.txt'), 'content')

    await expect(scaffold(projectName, { targetDir })).rejects.toThrow('already exists')
  })
})

// ============================================================================
// Renderer Selection Tests
// ============================================================================

describe('scaffold with renderer selection', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloudwerk-renderer-test-'))
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  const importScaffold = async () => {
    const module = await import('../scaffold.js')
    return module.scaffold
  }

  it('should use hono-jsx renderer by default', async () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'hono-default-test'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir })

    // Verify cloudwerk.config.ts has hono-jsx renderer
    const config = await fs.readFile(
      path.join(targetDir, 'cloudwerk.config.ts'),
      'utf-8'
    )
    expect(config).toContain("renderer: 'hono-jsx'")

    // Verify tsconfig.json has JSX configuration for Hono
    const tsconfig = await fs.readJson(path.join(targetDir, 'tsconfig.json'))
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx')
    expect(tsconfig.compilerOptions.jsxImportSource).toBe('hono/jsx')

    // Verify page.tsx exists
    expect(fs.existsSync(path.join(targetDir, 'app', 'routes', 'page.tsx'))).toBe(true)

    // Verify counter component exists with hono/jsx import
    const counter = await fs.readFile(
      path.join(targetDir, 'app', 'components', 'counter.tsx'),
      'utf-8'
    )
    expect(counter).toContain("from 'hono/jsx'")

    mockLog.mockRestore()
  })

  it('should scaffold with hono-jsx renderer', async () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'hono-jsx-test'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir, renderer: 'hono-jsx' })

    // Verify cloudwerk.config.ts has hono-jsx renderer
    const config = await fs.readFile(
      path.join(targetDir, 'cloudwerk.config.ts'),
      'utf-8'
    )
    expect(config).toContain("renderer: 'hono-jsx'")

    // Verify tsconfig.json has JSX configuration for Hono
    const tsconfig = await fs.readJson(path.join(targetDir, 'tsconfig.json'))
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx')
    expect(tsconfig.compilerOptions.jsxImportSource).toBe('hono/jsx')

    // Verify page.tsx exists
    expect(fs.existsSync(path.join(targetDir, 'app', 'routes', 'page.tsx'))).toBe(true)

    // Verify counter component exists with hono/jsx import
    const counter = await fs.readFile(
      path.join(targetDir, 'app', 'components', 'counter.tsx'),
      'utf-8'
    )
    expect(counter).toContain("from 'hono/jsx'")

    mockLog.mockRestore()
  })

  it('should scaffold with react renderer', async () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'react-test'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir, renderer: 'react' })

    // Verify cloudwerk.config.ts has react renderer
    const config = await fs.readFile(
      path.join(targetDir, 'cloudwerk.config.ts'),
      'utf-8'
    )
    expect(config).toContain("renderer: 'react'")

    // Verify tsconfig.json has JSX configuration for React
    const tsconfig = await fs.readJson(path.join(targetDir, 'tsconfig.json'))
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx')
    expect(tsconfig.compilerOptions.jsxImportSource).toBe('react')

    // Verify package.json has React dependencies
    const pkgJson = await fs.readJson(path.join(targetDir, 'package.json'))
    expect(pkgJson.dependencies.react).toBeDefined()
    expect(pkgJson.dependencies['react-dom']).toBeDefined()
    expect(pkgJson.devDependencies['@types/react']).toBeDefined()
    expect(pkgJson.devDependencies['@types/react-dom']).toBeDefined()

    // Verify page.tsx exists
    expect(fs.existsSync(path.join(targetDir, 'app', 'routes', 'page.tsx'))).toBe(true)

    // Verify counter component exists with react import
    const counter = await fs.readFile(
      path.join(targetDir, 'app', 'components', 'counter.tsx'),
      'utf-8'
    )
    expect(counter).toContain("from 'react'")

    mockLog.mockRestore()
  })

  it('should scaffold with none renderer (API only)', async () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const scaffold = await importScaffold()
    const projectName = 'api-only-test'
    const targetDir = path.join(tempDir, projectName)

    await scaffold(projectName, { targetDir, renderer: 'none' })

    // Verify cloudwerk.config.ts does NOT have ui config
    const config = await fs.readFile(
      path.join(targetDir, 'cloudwerk.config.ts'),
      'utf-8'
    )
    expect(config).not.toContain('renderer')
    expect(config).not.toContain('ui:')

    // Verify tsconfig.json does NOT have JSX configuration
    const tsconfig = await fs.readJson(path.join(targetDir, 'tsconfig.json'))
    expect(tsconfig.compilerOptions.jsx).toBeUndefined()
    expect(tsconfig.compilerOptions.jsxImportSource).toBeUndefined()

    // Verify route.ts exists (API route)
    expect(fs.existsSync(path.join(targetDir, 'app', 'routes', 'route.ts'))).toBe(true)

    // Verify page.tsx does NOT exist
    expect(fs.existsSync(path.join(targetDir, 'app', 'routes', 'page.tsx'))).toBe(false)

    // Verify components directory does NOT exist
    expect(fs.existsSync(path.join(targetDir, 'app', 'components'))).toBe(false)

    mockLog.mockRestore()
  })
})

// ============================================================================
// isInteractiveMode Tests
// ============================================================================

describe('isInteractiveMode', () => {
  const originalEnv = process.env
  const originalStdin = process.stdin.isTTY

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalStdin,
      writable: true,
    })
  })

  it('should return false when CI=true', () => {
    process.env.CI = 'true'
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true })
    expect(isInteractiveMode([])).toBe(false)
  })

  it('should return false when CI=1', () => {
    process.env.CI = '1'
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true })
    expect(isInteractiveMode([])).toBe(false)
  })

  it('should return false when --renderer flag is present', () => {
    delete process.env.CI
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true })
    expect(isInteractiveMode(['node', 'create-cloudwerk-app', 'my-app', '--renderer', 'react'])).toBe(false)
  })

  it('should return false when -r flag is present', () => {
    delete process.env.CI
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true })
    expect(isInteractiveMode(['node', 'create-cloudwerk-app', 'my-app', '-r', 'react'])).toBe(false)
  })

  it('should return false when not in TTY', () => {
    delete process.env.CI
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true })
    expect(isInteractiveMode([])).toBe(false)
  })

  it('should return true when in TTY with no CI and no renderer flag', () => {
    delete process.env.CI
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true })
    expect(isInteractiveMode(['node', 'create-cloudwerk-app', 'my-app'])).toBe(true)
  })
})
