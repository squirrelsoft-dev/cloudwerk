// Feature Flags SDK

export interface EvaluationContext {
  userId?: string
  email?: string
  country?: string
  device?: string
  platform?: string
  version?: string
  environment?: string
  [key: string]: unknown
}

export interface FlagEvaluation<T = unknown> {
  value: T
  reason: string
  ruleId?: string
  type: string
}

export interface FeatureFlagClientOptions {
  baseUrl: string
  context?: EvaluationContext
  refreshInterval?: number
  onError?: (error: Error) => void
}

export class FeatureFlagClient {
  private baseUrl: string
  private context: EvaluationContext
  private cache: Map<string, FlagEvaluation> = new Map()
  private refreshInterval: number
  private refreshTimer?: ReturnType<typeof setInterval>
  private onError?: (error: Error) => void
  private listeners: Set<() => void> = new Set()

  constructor(options: FeatureFlagClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.context = options.context || {}
    this.refreshInterval = options.refreshInterval || 60000 // 1 minute default
    this.onError = options.onError
  }

  /**
   * Update the evaluation context
   */
  setContext(context: EvaluationContext): void {
    this.context = { ...this.context, ...context }
    this.refreshAll()
  }

  /**
   * Get the current context
   */
  getContext(): EvaluationContext {
    return { ...this.context }
  }

  /**
   * Evaluate a single flag
   */
  async evaluate<T = unknown>(key: string, defaultValue: T): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      return cached.value as T
    }

    try {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(this.context)) {
        if (v !== undefined && v !== null) {
          params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
        }
      }

      const url = `${this.baseUrl}/api/flags/${encodeURIComponent(key)}?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          return defaultValue
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as FlagEvaluation<T>
      this.cache.set(key, data)
      return data.value
    } catch (error) {
      this.handleError(error as Error)
      return defaultValue
    }
  }

  /**
   * Evaluate all flags for the current context
   */
  async evaluateAll(): Promise<Map<string, FlagEvaluation>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: this.context }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as { flags: Record<string, FlagEvaluation> }

      // Update cache
      this.cache.clear()
      for (const [key, evaluation] of Object.entries(data.flags)) {
        this.cache.set(key, evaluation)
      }

      this.notifyListeners()
      return this.cache
    } catch (error) {
      this.handleError(error as Error)
      return this.cache
    }
  }

  /**
   * Get a flag value from cache (synchronous)
   */
  get<T = unknown>(key: string, defaultValue: T): T {
    const cached = this.cache.get(key)
    return cached ? (cached.value as T) : defaultValue
  }

  /**
   * Check if a boolean flag is enabled
   */
  isEnabled(key: string): boolean {
    const value = this.get<unknown>(key, false)
    return value === true
  }

  /**
   * Start auto-refresh
   */
  startRefresh(): void {
    if (this.refreshTimer) return

    this.refreshTimer = setInterval(() => {
      this.refreshAll()
    }, this.refreshInterval)

    // Initial fetch
    this.refreshAll()
  }

  /**
   * Stop auto-refresh
   */
  stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  /**
   * Refresh all flags
   */
  async refreshAll(): Promise<void> {
    await this.evaluateAll()
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch {
        // Ignore listener errors
      }
    }
  }

  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error)
    } else {
      console.error('[FeatureFlags]', error.message)
    }
  }
}

/**
 * Create a feature flag client instance
 */
export function createClient(options: FeatureFlagClientOptions): FeatureFlagClient {
  return new FeatureFlagClient(options)
}

export default FeatureFlagClient
