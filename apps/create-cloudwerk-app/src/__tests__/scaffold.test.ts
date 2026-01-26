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
    expect(fs.existsSync(path.join(targetDir, 'cloudwerk.config.js'))).toBe(true)
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
    expect(pkgJson.dependencies['@cloudwerk/core']).toBe('^0.0.1')
    expect(pkgJson.dependencies['@cloudwerk/cli']).toBe('^0.0.1')

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
