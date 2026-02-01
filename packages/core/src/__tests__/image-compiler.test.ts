/**
 * @cloudwerk/core - Image Compiler Tests
 */

import { describe, it, expect } from 'vitest'
import {
  compileImage,
  buildImageManifest,
  updateImageEntryFromDefinition,
  hasImageErrors,
  hasImageWarnings,
  formatImageErrors,
  formatImageWarnings,
} from '../image-compiler.js'
import type { ScannedImage, ImageScanResult } from '../image-scanner.js'

describe('Image Compiler', () => {
  describe('compileImage', () => {
    it('should compile a scanned image into an entry', () => {
      const scannedImage: ScannedImage = {
        relativePath: 'avatars.ts',
        absolutePath: '/app/images/avatars.ts',
        name: 'avatars',
        extension: '.ts',
      }

      const entry = compileImage(scannedImage)

      expect(entry.name).toBe('avatars')
      expect(entry.bindingName).toBe('AVATARS_IMAGES')
      expect(entry.filePath).toBe('avatars.ts')
      expect(entry.absolutePath).toBe('/app/images/avatars.ts')
      expect(entry.variants).toEqual({})
      expect(entry.config).toEqual({})
    })

    it('should convert kebab-case filenames to camelCase names', () => {
      const scannedImage: ScannedImage = {
        relativePath: 'user-avatars.ts',
        absolutePath: '/app/images/user-avatars.ts',
        name: 'user-avatars',
        extension: '.ts',
      }

      const entry = compileImage(scannedImage)

      expect(entry.name).toBe('userAvatars')
      expect(entry.bindingName).toBe('USER_AVATARS_IMAGES')
    })
  })

  describe('buildImageManifest', () => {
    it('should build manifest from scan results', () => {
      const scanResult: ImageScanResult = {
        images: [
          {
            relativePath: 'avatars.ts',
            absolutePath: '/app/images/avatars.ts',
            name: 'avatars',
            extension: '.ts',
          },
          {
            relativePath: 'products.ts',
            absolutePath: '/app/images/products.ts',
            name: 'products',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildImageManifest(scanResult, '/app')

      expect(manifest.images).toHaveLength(2)
      expect(manifest.images[0].name).toBe('avatars')
      expect(manifest.images[1].name).toBe('products')
      expect(manifest.rootDir).toBe('/app')
      expect(manifest.generatedAt).toBeInstanceOf(Date)
    })

    it('should detect duplicate image names', () => {
      const scanResult: ImageScanResult = {
        images: [
          {
            relativePath: 'avatars.ts',
            absolutePath: '/app/images/avatars.ts',
            name: 'avatars',
            extension: '.ts',
          },
          {
            relativePath: 'avatars.tsx',
            absolutePath: '/app/images/avatars.tsx',
            name: 'avatars',
            extension: '.tsx',
          },
        ],
      }

      const manifest = buildImageManifest(scanResult, '/app')

      expect(manifest.images).toHaveLength(1)
      expect(manifest.errors).toHaveLength(1)
      expect(manifest.errors[0].code).toBe('DUPLICATE_NAME')
    })

    it('should warn about missing variants', () => {
      const scanResult: ImageScanResult = {
        images: [
          {
            relativePath: 'avatars.ts',
            absolutePath: '/app/images/avatars.ts',
            name: 'avatars',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildImageManifest(scanResult, '/app')

      expect(manifest.warnings).toHaveLength(1)
      expect(manifest.warnings[0].code).toBe('NO_VARIANTS')
    })

    it('should reject invalid image names', () => {
      const scanResult: ImageScanResult = {
        images: [
          {
            relativePath: '_invalid.ts',
            absolutePath: '/app/images/_invalid.ts',
            name: '_invalid',
            extension: '.ts',
          },
        ],
      }

      const manifest = buildImageManifest(scanResult, '/app')

      expect(manifest.images).toHaveLength(0)
      expect(manifest.errors).toHaveLength(1)
      expect(manifest.errors[0].code).toBe('INVALID_NAME')
    })
  })

  describe('updateImageEntryFromDefinition', () => {
    it('should update entry with definition values', () => {
      const entry = {
        name: 'avatars',
        bindingName: 'AVATARS_IMAGES',
        filePath: 'avatars.ts',
        absolutePath: '/app/images/avatars.ts',
        variants: {},
        config: {},
      }

      const definition = {
        name: 'userAvatars',
        config: {
          deliveryUrl: 'https://images.example.com',
        },
        variants: {
          thumbnail: { width: 100, height: 100, fit: 'cover' as const },
          profile: { width: 400, height: 400, fit: 'cover' as const },
        },
      }

      const updated = updateImageEntryFromDefinition(entry, definition)

      expect(updated.name).toBe('userAvatars')
      expect(updated.variants).toEqual(definition.variants)
      expect(updated.config).toEqual(definition.config)
    })

    it('should keep original name if not provided in definition', () => {
      const entry = {
        name: 'avatars',
        bindingName: 'AVATARS_IMAGES',
        filePath: 'avatars.ts',
        absolutePath: '/app/images/avatars.ts',
        variants: {},
        config: {},
      }

      const definition = {
        variants: {
          thumbnail: { width: 100, height: 100 },
        },
      }

      const updated = updateImageEntryFromDefinition(entry, definition)

      expect(updated.name).toBe('avatars')
    })
  })

  describe('hasImageErrors', () => {
    it('should return true when there are errors', () => {
      const manifest = {
        images: [],
        errors: [{ file: 'test.ts', message: 'Error', code: 'INVALID_NAME' as const }],
        warnings: [],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasImageErrors(manifest)).toBe(true)
    })

    it('should return false when there are no errors', () => {
      const manifest = {
        images: [],
        errors: [],
        warnings: [],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasImageErrors(manifest)).toBe(false)
    })
  })

  describe('hasImageWarnings', () => {
    it('should return true when there are warnings', () => {
      const manifest = {
        images: [],
        errors: [],
        warnings: [{ file: 'test.ts', message: 'Warning', code: 'NO_VARIANTS' as const }],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasImageWarnings(manifest)).toBe(true)
    })

    it('should return false when there are no warnings', () => {
      const manifest = {
        images: [],
        errors: [],
        warnings: [],
        generatedAt: new Date(),
        rootDir: '/app',
      }

      expect(hasImageWarnings(manifest)).toBe(false)
    })
  })

  describe('formatImageErrors', () => {
    it('should format errors for display', () => {
      const errors = [
        { file: 'avatars.ts', message: 'Invalid name', code: 'INVALID_NAME' as const },
        { file: 'products.ts', message: 'Duplicate', code: 'DUPLICATE_NAME' as const },
      ]

      const output = formatImageErrors(errors)

      expect(output).toContain('Image validation errors:')
      expect(output).toContain('avatars.ts: Invalid name')
      expect(output).toContain('products.ts: Duplicate')
    })

    it('should return empty string for no errors', () => {
      expect(formatImageErrors([])).toBe('')
    })
  })

  describe('formatImageWarnings', () => {
    it('should format warnings for display', () => {
      const warnings = [
        { file: 'avatars.ts', message: 'No variants', code: 'NO_VARIANTS' as const },
      ]

      const output = formatImageWarnings(warnings)

      expect(output).toContain('Image validation warnings:')
      expect(output).toContain('avatars.ts: No variants')
    })

    it('should return empty string for no warnings', () => {
      expect(formatImageWarnings([])).toBe('')
    })
  })
})
