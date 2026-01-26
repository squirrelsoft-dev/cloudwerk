/**
 * @cloudwerk/core - Config Tests
 *
 * Tests for configuration loading and validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  defineConfig,
  mergeConfig,
  DEFAULT_CONFIG,
  findConfigFile,
  validateConfig,
  resolveRoutesDir,
  isSupportedExtension,
} from '../config.js'
import type { CloudwerkConfig, CloudwerkUserConfig } from '../types.js'

// ============================================================================
// defineConfig Tests
// ============================================================================

describe('defineConfig', () => {
  it('should return config with defaults applied', () => {
    const config = defineConfig({})

    expect(config.routesDir).toBe('app')
    expect(config.extensions).toEqual(['.ts', '.tsx'])
    expect(config.strict).toBe(true)
    expect(config.basePath).toBe('/')
    expect(config.debug).toBe(false)
  })

  it('should override defaults with user values', () => {
    const config = defineConfig({
      routesDir: 'src/routes',
      extensions: ['.ts'],
      strict: false,
      basePath: '/api',
      debug: true,
    })

    expect(config.routesDir).toBe('src/routes')
    expect(config.extensions).toEqual(['.ts'])
    expect(config.strict).toBe(false)
    expect(config.basePath).toBe('/api')
    expect(config.debug).toBe(true)
  })

  it('should preserve partial overrides', () => {
    const config = defineConfig({
      routesDir: 'custom',
    })

    expect(config.routesDir).toBe('custom')
    expect(config.extensions).toEqual(['.ts', '.tsx']) // Default
    expect(config.strict).toBe(true) // Default
  })
})

// ============================================================================
// mergeConfig Tests
// ============================================================================

describe('mergeConfig', () => {
  it('should merge user config with defaults', () => {
    const user: CloudwerkUserConfig = {
      routesDir: 'pages',
      debug: true,
    }

    const result = mergeConfig(DEFAULT_CONFIG, user)

    expect(result.routesDir).toBe('pages')
    expect(result.debug).toBe(true)
    expect(result.extensions).toEqual(DEFAULT_CONFIG.extensions)
  })

  it('should use all defaults when user config is empty', () => {
    const result = mergeConfig(DEFAULT_CONFIG, {})

    expect(result).toEqual(DEFAULT_CONFIG)
  })

  it('should handle undefined values in user config', () => {
    const user: CloudwerkUserConfig = {
      routesDir: undefined,
      extensions: undefined,
    }

    const result = mergeConfig(DEFAULT_CONFIG, user)

    expect(result.routesDir).toBe(DEFAULT_CONFIG.routesDir)
    expect(result.extensions).toEqual(DEFAULT_CONFIG.extensions)
  })
})

// ============================================================================
// findConfigFile Tests
// ============================================================================

describe('findConfigFile', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-config-'))
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should find cloudwerk.config.ts', () => {
    const configPath = path.join(tempDir, 'cloudwerk.config.ts')
    fs.writeFileSync(configPath, 'export default {}')

    const result = findConfigFile(tempDir)

    expect(result).toBe(configPath)
  })

  it('should find cloudwerk.config.js', () => {
    const subDir = path.join(tempDir, 'js-config')
    fs.mkdirSync(subDir, { recursive: true })
    const configPath = path.join(subDir, 'cloudwerk.config.js')
    fs.writeFileSync(configPath, 'module.exports = {}')

    const result = findConfigFile(subDir)

    expect(result).toBe(configPath)
  })

  it('should return null when no config file exists', () => {
    const emptyDir = path.join(tempDir, 'empty')
    fs.mkdirSync(emptyDir, { recursive: true })

    const result = findConfigFile(emptyDir)

    expect(result).toBeNull()
  })

  it('should prefer .ts over .js', () => {
    const bothDir = path.join(tempDir, 'both')
    fs.mkdirSync(bothDir, { recursive: true })
    fs.writeFileSync(path.join(bothDir, 'cloudwerk.config.ts'), 'export default {}')
    fs.writeFileSync(path.join(bothDir, 'cloudwerk.config.js'), 'module.exports = {}')

    const result = findConfigFile(bothDir)

    expect(result).toContain('cloudwerk.config.ts')
  })
})

// ============================================================================
// validateConfig Tests
// ============================================================================

describe('validateConfig', () => {
  it('should return empty array for valid config', () => {
    const errors = validateConfig(DEFAULT_CONFIG)
    expect(errors).toHaveLength(0)
  })

  it('should error for empty routesDir', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      routesDir: '',
    }

    const errors = validateConfig(config)

    expect(errors.some(e => e.includes('routesDir'))).toBe(true)
  })

  it('should error for empty extensions array', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      extensions: [],
    }

    const errors = validateConfig(config)

    expect(errors.some(e => e.includes('extensions'))).toBe(true)
  })

  it('should error for invalid extension', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      extensions: ['.py' as any],
    }

    const errors = validateConfig(config)

    expect(errors.some(e => e.includes('Invalid extension'))).toBe(true)
  })

  it('should error for basePath not starting with /', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      basePath: 'api',
    }

    const errors = validateConfig(config)

    expect(errors.some(e => e.includes('basePath'))).toBe(true)
  })
})

// ============================================================================
// resolveRoutesDir Tests
// ============================================================================

describe('resolveRoutesDir', () => {
  it('should resolve relative path', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      routesDir: 'app',
    }

    const result = resolveRoutesDir(config, '/project')

    expect(result).toBe(path.resolve('/project', 'app'))
  })

  it('should preserve absolute path', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      routesDir: '/absolute/path/routes',
    }

    const result = resolveRoutesDir(config, '/project')

    expect(result).toBe('/absolute/path/routes')
  })

  it('should handle nested relative paths', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      routesDir: 'src/routes',
    }

    const result = resolveRoutesDir(config, '/project')

    expect(result).toBe(path.resolve('/project', 'src/routes'))
  })
})

// ============================================================================
// isSupportedExtension Tests
// ============================================================================

describe('isSupportedExtension', () => {
  it('should return true for supported extensions', () => {
    const config = DEFAULT_CONFIG

    expect(isSupportedExtension('.ts', config)).toBe(true)
    expect(isSupportedExtension('.tsx', config)).toBe(true)
  })

  it('should return false for unsupported extensions', () => {
    const config = DEFAULT_CONFIG

    expect(isSupportedExtension('.js', config)).toBe(false)
    expect(isSupportedExtension('.py', config)).toBe(false)
  })

  it('should respect custom extensions config', () => {
    const config: CloudwerkConfig = {
      ...DEFAULT_CONFIG,
      extensions: ['.js', '.jsx'],
    }

    expect(isSupportedExtension('.js', config)).toBe(true)
    expect(isSupportedExtension('.jsx', config)).toBe(true)
    expect(isSupportedExtension('.ts', config)).toBe(false)
  })
})
