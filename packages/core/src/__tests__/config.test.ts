/**
 * @cloudwerk/core - Config Tests
 *
 * Tests for configuration loading and validation.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  defineConfig,
  mergeConfig,
  DEFAULT_CONFIG,
  findConfigFile,
  loadConfig,
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

// ============================================================================
// loadConfig Tests
// ============================================================================

describe('loadConfig', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-loadconfig-'))
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should return defaults when no config file exists', async () => {
    const emptyDir = path.join(tempDir, 'empty')
    fs.mkdirSync(emptyDir, { recursive: true })

    const config = await loadConfig(emptyDir)

    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('should load and compile TypeScript config files', async () => {
    const tsDir = path.join(tempDir, 'ts-config')
    fs.mkdirSync(tsDir, { recursive: true })

    // Create a TypeScript config file (without actual imports to avoid bundling issues in tests)
    const tsConfig = `
const config = {
  routesDir: 'src/routes',
  debug: true,
}
export default config
`
    fs.writeFileSync(path.join(tsDir, 'cloudwerk.config.ts'), tsConfig)

    const config = await loadConfig(tsDir)

    expect(config.routesDir).toBe('src/routes')
    expect(config.debug).toBe(true)
    // Defaults should still be applied for unspecified values
    expect(config.extensions).toEqual(DEFAULT_CONFIG.extensions)
    expect(config.strict).toBe(DEFAULT_CONFIG.strict)
  })

  it('should clean up temp files after loading TypeScript config', async () => {
    const cleanupDir = path.join(tempDir, 'cleanup-test')
    fs.mkdirSync(cleanupDir, { recursive: true })

    const tsConfig = `export default { routesDir: 'test' }`
    fs.writeFileSync(path.join(cleanupDir, 'cloudwerk.config.ts'), tsConfig)

    // Get temp directory file count before
    const osTmpDir = os.tmpdir()
    const beforeFiles = fs.readdirSync(osTmpDir).filter(f => f.startsWith('cloudwerk-config-'))

    await loadConfig(cleanupDir)

    // Give a small delay for cleanup
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check that no new temp files remain
    const afterFiles = fs.readdirSync(osTmpDir).filter(f => f.startsWith('cloudwerk-config-'))
    expect(afterFiles.length).toBeLessThanOrEqual(beforeFiles.length)
  })

  it('should fall back to defaults on compilation error with warning', async () => {
    const errorDir = path.join(tempDir, 'error-config')
    fs.mkdirSync(errorDir, { recursive: true })

    // Create an invalid TypeScript config (syntax error)
    const invalidConfig = `export default { invalid syntax here`
    fs.writeFileSync(path.join(errorDir, 'cloudwerk.config.ts'), invalidConfig)

    // Mock console.warn to capture the warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config = await loadConfig(errorDir)

    expect(config).toEqual(DEFAULT_CONFIG)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warning: Could not load config'),
      expect.anything()
    )

    warnSpy.mockRestore()
  })

  it('should load JavaScript config files without compilation', async () => {
    const jsDir = path.join(tempDir, 'js-config')
    fs.mkdirSync(jsDir, { recursive: true })

    // Create a JavaScript config file (ESM)
    const jsConfig = `export default { routesDir: 'js-routes', basePath: '/api' }`
    fs.writeFileSync(path.join(jsDir, 'cloudwerk.config.mjs'), jsConfig)

    const config = await loadConfig(jsDir)

    expect(config.routesDir).toBe('js-routes')
    expect(config.basePath).toBe('/api')
  })
})
