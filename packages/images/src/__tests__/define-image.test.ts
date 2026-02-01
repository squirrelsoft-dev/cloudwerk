/**
 * @cloudwerk/images - defineImage Tests
 */

import { describe, it, expect } from 'vitest'
import { defineImage, isImageDefinition } from '../define-image.js'
import { ImageConfigError } from '../errors.js'

describe('defineImage', () => {
  it('should create an image definition with basic config', () => {
    const definition = defineImage({
      name: 'avatars',
      variants: {
        thumbnail: { width: 100, height: 100, fit: 'cover' },
      },
    })

    expect(definition.__brand).toBe('cloudwerk-image')
    expect(definition.name).toBe('avatars')
    expect(definition.variants).toHaveProperty('thumbnail')
    expect(definition.variants.thumbnail).toEqual({
      width: 100,
      height: 100,
      fit: 'cover',
    })
  })

  it('should create an image definition with empty config', () => {
    const definition = defineImage()

    expect(definition.__brand).toBe('cloudwerk-image')
    expect(definition.name).toBe('')
    expect(definition.variants).toEqual({})
  })

  it('should accept multiple variants', () => {
    const definition = defineImage({
      variants: {
        thumbnail: { width: 100, height: 100, fit: 'cover' },
        profile: { width: 400, height: 400, fit: 'cover' },
        large: { width: 1200, height: 800, fit: 'contain' },
      },
    })

    expect(Object.keys(definition.variants)).toHaveLength(3)
    expect(definition.variants).toHaveProperty('thumbnail')
    expect(definition.variants).toHaveProperty('profile')
    expect(definition.variants).toHaveProperty('large')
  })

  it('should accept all variant options', () => {
    const definition = defineImage({
      variants: {
        test: {
          width: 100,
          height: 100,
          fit: 'cover',
          blur: 10,
          quality: 80,
          format: 'webp',
          dpr: 2,
          gravity: 'face',
          sharpen: 5,
          brightness: 0.1,
          contrast: -0.1,
          rotate: 90,
          metadata: 'none',
        },
      },
    })

    expect(definition.variants.test).toEqual({
      width: 100,
      height: 100,
      fit: 'cover',
      blur: 10,
      quality: 80,
      format: 'webp',
      dpr: 2,
      gravity: 'face',
      sharpen: 5,
      brightness: 0.1,
      contrast: -0.1,
      rotate: 90,
      metadata: 'none',
    })
  })

  it('should accept config with deliveryUrl', () => {
    const definition = defineImage({
      deliveryUrl: 'https://images.example.com',
      variants: {
        thumbnail: { width: 100, height: 100 },
      },
    })

    expect(definition.config.deliveryUrl).toBe('https://images.example.com')
  })

  it('should accept config with requireSignedURLs', () => {
    const definition = defineImage({
      requireSignedURLs: true,
    })

    expect(definition.config.requireSignedURLs).toBe(true)
  })

  describe('validation', () => {
    it('should throw for invalid name format', () => {
      expect(() => {
        defineImage({ name: 'Invalid-Name' })
      }).toThrow(ImageConfigError)

      expect(() => {
        defineImage({ name: '123invalid' })
      }).toThrow(ImageConfigError)
    })

    it('should throw for empty name string', () => {
      expect(() => {
        defineImage({ name: '' })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid deliveryUrl', () => {
      expect(() => {
        defineImage({ deliveryUrl: 'not-a-url' })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid variant name format', () => {
      expect(() => {
        defineImage({
          variants: {
            'Invalid-Variant': { width: 100 },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid width value', () => {
      expect(() => {
        defineImage({
          variants: {
            test: { width: -100 },
          },
        })
      }).toThrow(ImageConfigError)

      expect(() => {
        defineImage({
          variants: {
            test: { width: 0 },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid blur value', () => {
      expect(() => {
        defineImage({
          variants: {
            test: { blur: 0 },
          },
        })
      }).toThrow(ImageConfigError)

      expect(() => {
        defineImage({
          variants: {
            test: { blur: 300 },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid quality value', () => {
      expect(() => {
        defineImage({
          variants: {
            test: { quality: 0 },
          },
        })
      }).toThrow(ImageConfigError)

      expect(() => {
        defineImage({
          variants: {
            test: { quality: 150 },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid dpr value', () => {
      expect(() => {
        defineImage({
          variants: {
            test: { dpr: 0 },
          },
        })
      }).toThrow(ImageConfigError)

      expect(() => {
        defineImage({
          variants: {
            test: { dpr: 5 },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid fit value', () => {
      expect(() => {
        defineImage({
          variants: {
            // @ts-expect-error Testing invalid value
            test: { fit: 'invalid' },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid format value', () => {
      expect(() => {
        defineImage({
          variants: {
            // @ts-expect-error Testing invalid value
            test: { format: 'gif' },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for invalid gravity value', () => {
      expect(() => {
        defineImage({
          variants: {
            // @ts-expect-error Testing invalid value
            test: { gravity: 'northwest' },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should throw for defaultVariant referencing non-existent variant', () => {
      expect(() => {
        defineImage({
          defaultVariant: 'nonexistent',
          variants: {
            thumbnail: { width: 100 },
          },
        })
      }).toThrow(ImageConfigError)
    })

    it('should accept valid defaultVariant', () => {
      const definition = defineImage({
        defaultVariant: 'thumbnail',
        variants: {
          thumbnail: { width: 100 },
        },
      })

      expect(definition.config.defaultVariant).toBe('thumbnail')
    })
  })
})

describe('isImageDefinition', () => {
  it('should return true for image definitions', () => {
    const definition = defineImage({
      variants: {
        thumbnail: { width: 100, height: 100 },
      },
    })

    expect(isImageDefinition(definition)).toBe(true)
  })

  it('should return false for non-image objects', () => {
    expect(isImageDefinition({})).toBe(false)
    expect(isImageDefinition({ __brand: 'other' })).toBe(false)
    expect(isImageDefinition(null)).toBe(false)
    expect(isImageDefinition(undefined)).toBe(false)
    expect(isImageDefinition('string')).toBe(false)
    expect(isImageDefinition(123)).toBe(false)
  })
})
