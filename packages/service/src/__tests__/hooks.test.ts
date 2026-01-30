import { describe, it, expect, vi } from 'vitest'
import { HooksManager, createHooksManager } from '../hooks/manager.js'

describe('HooksManager', () => {
  describe('constructor', () => {
    it('should create manager with hooks', () => {
      const hooks = {
        onInit: async () => {},
        onBefore: async () => {},
        onAfter: async () => {},
        onError: async () => {},
      }

      const manager = new HooksManager(hooks)
      expect(manager.hasHooks).toBe(true)
      expect(manager.isInitialized).toBe(false)
    })

    it('should create manager without hooks', () => {
      const manager = new HooksManager(undefined)
      expect(manager.hasHooks).toBe(false)
      expect(manager.isInitialized).toBe(false)
    })
  })

  describe('runInit', () => {
    it('should run onInit hook once', async () => {
      const onInit = vi.fn()
      const manager = new HooksManager({ onInit })

      expect(manager.isInitialized).toBe(false)

      const result1 = await manager.runInit()
      expect(result1).toBe(true)
      expect(onInit).toHaveBeenCalledTimes(1)
      expect(manager.isInitialized).toBe(true)

      // Second call should not run hook
      const result2 = await manager.runInit()
      expect(result2).toBe(false)
      expect(onInit).toHaveBeenCalledTimes(1)
    })

    it('should mark initialized even without hook', async () => {
      const manager = new HooksManager({})

      expect(manager.isInitialized).toBe(false)
      await manager.runInit()
      expect(manager.isInitialized).toBe(true)
    })
  })

  describe('runBefore', () => {
    it('should call onBefore with method and args', async () => {
      const onBefore = vi.fn()
      const manager = new HooksManager({ onBefore })

      await manager.runBefore('send', [{ to: 'user@example.com' }])

      expect(onBefore).toHaveBeenCalledWith('send', [{ to: 'user@example.com' }])
    })

    it('should not throw without hook', async () => {
      const manager = new HooksManager({})

      await expect(manager.runBefore('send', [])).resolves.toBeUndefined()
    })
  })

  describe('runAfter', () => {
    it('should call onAfter with method and result', async () => {
      const onAfter = vi.fn()
      const manager = new HooksManager({ onAfter })

      await manager.runAfter('send', { success: true })

      expect(onAfter).toHaveBeenCalledWith('send', { success: true })
    })

    it('should not throw without hook', async () => {
      const manager = new HooksManager({})

      await expect(manager.runAfter('send', null)).resolves.toBeUndefined()
    })
  })

  describe('runError', () => {
    it('should call onError with method and error', async () => {
      const onError = vi.fn()
      const manager = new HooksManager({ onError })

      const error = new Error('Test error')
      await manager.runError('send', error)

      expect(onError).toHaveBeenCalledWith('send', error)
    })

    it('should not throw without hook', async () => {
      const manager = new HooksManager({})

      await expect(
        manager.runError('send', new Error('test'))
      ).resolves.toBeUndefined()
    })
  })

  describe('executeWithHooks', () => {
    it('should run full lifecycle on success', async () => {
      const onBefore = vi.fn()
      const onAfter = vi.fn()
      const onError = vi.fn()

      const manager = new HooksManager({ onBefore, onAfter, onError })

      const fn = vi.fn().mockResolvedValue({ success: true })

      const result = await manager.executeWithHooks('send', [{ to: 'user' }], fn)

      expect(result).toEqual({ success: true })
      expect(onBefore).toHaveBeenCalledWith('send', [{ to: 'user' }])
      expect(onAfter).toHaveBeenCalledWith('send', { success: true })
      expect(onError).not.toHaveBeenCalled()
    })

    it('should run onError on failure and rethrow', async () => {
      const onBefore = vi.fn()
      const onAfter = vi.fn()
      const onError = vi.fn()

      const manager = new HooksManager({ onBefore, onAfter, onError })

      const error = new Error('Send failed')
      const fn = vi.fn().mockRejectedValue(error)

      await expect(
        manager.executeWithHooks('send', [], fn)
      ).rejects.toThrow('Send failed')

      expect(onBefore).toHaveBeenCalled()
      expect(onAfter).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith('send', error)
    })

    it('should work without hooks', async () => {
      const manager = new HooksManager({})

      const fn = vi.fn().mockResolvedValue({ success: true })

      const result = await manager.executeWithHooks('send', [], fn)

      expect(result).toEqual({ success: true })
      expect(fn).toHaveBeenCalled()
    })

    it('should convert non-Error throws to Error', async () => {
      const onError = vi.fn()
      const manager = new HooksManager({ onError })

      const fn = vi.fn().mockRejectedValue('string error')

      await expect(
        manager.executeWithHooks('send', [], fn)
      ).rejects.toThrow()

      expect(onError).toHaveBeenCalled()
      const [method, error] = onError.mock.calls[0]
      expect(method).toBe('send')
      expect(error).toBeInstanceOf(Error)
    })
  })
})

describe('createHooksManager', () => {
  it('should create a HooksManager instance', () => {
    const manager = createHooksManager({
      onInit: async () => {},
    })

    expect(manager).toBeInstanceOf(HooksManager)
    expect(manager.hasHooks).toBe(true)
  })

  it('should create manager without hooks', () => {
    const manager = createHooksManager(undefined)

    expect(manager).toBeInstanceOf(HooksManager)
    expect(manager.hasHooks).toBe(false)
  })
})
