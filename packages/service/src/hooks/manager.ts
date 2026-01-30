/**
 * @cloudwerk/service - Hooks Manager
 *
 * Manages lifecycle hook execution for services.
 */

import type { ServiceHooks } from '../types.js'

/**
 * Manages lifecycle hook execution for a service.
 *
 * Provides methods to safely execute hooks with error handling,
 * and tracks initialization state.
 *
 * @example
 * ```typescript
 * const manager = createHooksManager(service.hooks)
 *
 * // Initialize once
 * await manager.runInit()
 *
 * // Wrap method calls
 * await manager.runBefore('send', [{ to: 'user@example.com' }])
 * const result = await service.methods.send({ to: 'user@example.com' })
 * await manager.runAfter('send', result)
 * ```
 */
export class HooksManager {
  private readonly hooks: ServiceHooks | undefined
  private initialized = false

  constructor(hooks: ServiceHooks | undefined) {
    this.hooks = hooks
  }

  /**
   * Whether hooks are defined for this manager.
   */
  get hasHooks(): boolean {
    return this.hooks !== undefined
  }

  /**
   * Whether the service has been initialized.
   */
  get isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Run the onInit hook if defined.
   * Only runs once per manager instance.
   *
   * @returns true if hook ran successfully or wasn't defined, false if already initialized
   */
  async runInit(): Promise<boolean> {
    if (this.initialized) {
      return false
    }

    this.initialized = true

    if (this.hooks?.onInit) {
      await this.hooks.onInit()
    }

    return true
  }

  /**
   * Run the onBefore hook if defined.
   *
   * @param method - The method name being called
   * @param args - Arguments passed to the method
   */
  async runBefore(method: string, args: unknown[]): Promise<void> {
    if (this.hooks?.onBefore) {
      await this.hooks.onBefore(method, args)
    }
  }

  /**
   * Run the onAfter hook if defined.
   *
   * @param method - The method name that was called
   * @param result - The return value of the method
   */
  async runAfter(method: string, result: unknown): Promise<void> {
    if (this.hooks?.onAfter) {
      await this.hooks.onAfter(method, result)
    }
  }

  /**
   * Run the onError hook if defined.
   *
   * @param method - The method name that threw
   * @param error - The error that was thrown
   */
  async runError(method: string, error: Error): Promise<void> {
    if (this.hooks?.onError) {
      await this.hooks.onError(method, error)
    }
  }

  /**
   * Execute a method with full hook lifecycle.
   *
   * Runs onBefore, executes the method, then runs either onAfter (success)
   * or onError (failure).
   *
   * @param method - The method name
   * @param args - Arguments for the method
   * @param fn - The method function to execute
   * @returns The method's return value
   * @throws Re-throws any error from the method after running onError
   *
   * @example
   * ```typescript
   * const result = await manager.executeWithHooks(
   *   'send',
   *   [{ to: 'user@example.com' }],
   *   async () => service.methods.send({ to: 'user@example.com' })
   * )
   * ```
   */
  async executeWithHooks<T>(
    method: string,
    args: unknown[],
    fn: () => Promise<T>
  ): Promise<T> {
    await this.runBefore(method, args)

    try {
      const result = await fn()
      await this.runAfter(method, result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      await this.runError(method, error)
      throw error
    }
  }
}

/**
 * Create a new hooks manager for a service.
 *
 * @param hooks - The service hooks configuration
 * @returns A new HooksManager instance
 */
export function createHooksManager(
  hooks: ServiceHooks | undefined
): HooksManager {
  return new HooksManager(hooks)
}
