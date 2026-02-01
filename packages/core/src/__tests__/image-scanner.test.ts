/**
 * @cloudwerk/core - Image Scanner Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import {
  scanImages,
  scanImagesSync,
  isImageFile,
  fileNameToImageName,
  imageNameToBindingName,
  bindingNameToImageName,
  IMAGES_DIR,
} from '../image-scanner.js'

describe('Image Scanner', () => {
  describe('isImageFile', () => {
    it('should return true for valid image files', () => {
      expect(isImageFile('avatars.ts')).toBe(true)
      expect(isImageFile('products.tsx')).toBe(true)
      expect(isImageFile('user-photos.js')).toBe(true)
      expect(isImageFile('thumbnails.jsx')).toBe(true)
    })

    it('should return false for test files', () => {
      expect(isImageFile('avatars.test.ts')).toBe(false)
      expect(isImageFile('avatars.spec.ts')).toBe(false)
    })

    it('should return false for type definition files', () => {
      expect(isImageFile('types.d.ts')).toBe(false)
    })

    it('should return false for unsupported extensions', () => {
      expect(isImageFile('avatars.json')).toBe(false)
      expect(isImageFile('avatars.md')).toBe(false)
    })
  })

  describe('fileNameToImageName', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(fileNameToImageName('user-avatars')).toBe('userAvatars')
      expect(fileNameToImageName('product-images')).toBe('productImages')
    })

    it('should keep simple names unchanged', () => {
      expect(fileNameToImageName('avatars')).toBe('avatars')
      expect(fileNameToImageName('photos')).toBe('photos')
    })

    it('should handle multiple hyphens', () => {
      expect(fileNameToImageName('user-profile-photos')).toBe('userProfilePhotos')
    })
  })

  describe('imageNameToBindingName', () => {
    it('should convert camelCase to SCREAMING_SNAKE_CASE with _IMAGES suffix', () => {
      expect(imageNameToBindingName('avatars')).toBe('AVATARS_IMAGES')
      expect(imageNameToBindingName('userAvatars')).toBe('USER_AVATARS_IMAGES')
      expect(imageNameToBindingName('productImages')).toBe('PRODUCT_IMAGES_IMAGES')
    })
  })

  describe('bindingNameToImageName', () => {
    it('should convert SCREAMING_SNAKE_CASE_IMAGES to camelCase', () => {
      expect(bindingNameToImageName('AVATARS_IMAGES')).toBe('avatars')
      expect(bindingNameToImageName('USER_AVATARS_IMAGES')).toBe('userAvatars')
    })
  })

  describe('scanImages', () => {
    let testDir: string

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-image-test-'))
      const imagesDir = path.join(testDir, IMAGES_DIR)
      fs.mkdirSync(imagesDir, { recursive: true })
    })

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true })
    })

    it('should scan image definition files', async () => {
      const imagesDir = path.join(testDir, IMAGES_DIR)
      fs.writeFileSync(path.join(imagesDir, 'avatars.ts'), 'export default {}')
      fs.writeFileSync(path.join(imagesDir, 'products.ts'), 'export default {}')

      const result = await scanImages(testDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.images).toHaveLength(2)
      expect(result.images.map((i) => i.name).sort()).toEqual(['avatars', 'products'])
    })

    it('should ignore test files', async () => {
      const imagesDir = path.join(testDir, IMAGES_DIR)
      fs.writeFileSync(path.join(imagesDir, 'avatars.ts'), 'export default {}')
      fs.writeFileSync(path.join(imagesDir, 'avatars.test.ts'), 'test')

      const result = await scanImages(testDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].name).toBe('avatars')
    })

    it('should ignore index files', async () => {
      const imagesDir = path.join(testDir, IMAGES_DIR)
      fs.writeFileSync(path.join(imagesDir, 'avatars.ts'), 'export default {}')
      fs.writeFileSync(path.join(imagesDir, 'index.ts'), 'export * from "./avatars"')

      const result = await scanImages(testDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].name).toBe('avatars')
    })

    it('should return empty array when no images directory', async () => {
      fs.rmSync(path.join(testDir, IMAGES_DIR), { recursive: true })

      const result = await scanImages(testDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.images).toHaveLength(0)
    })
  })

  describe('scanImagesSync', () => {
    let testDir: string

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudwerk-image-test-'))
      const imagesDir = path.join(testDir, IMAGES_DIR)
      fs.mkdirSync(imagesDir, { recursive: true })
    })

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true })
    })

    it('should scan synchronously', () => {
      const imagesDir = path.join(testDir, IMAGES_DIR)
      fs.writeFileSync(path.join(imagesDir, 'avatars.ts'), 'export default {}')

      const result = scanImagesSync(testDir, {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].name).toBe('avatars')
    })
  })
})
