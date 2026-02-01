import type { PageProps, LoaderArgs } from '@cloudwerk/core'

interface Variant {
  id: string
  options: {
    fit?: string
    width?: number
    height?: number
    metadata?: string
  }
  neverRequireSignedURLs?: boolean
}

interface LoaderData {
  variants: Variant[]
  missing: string[]
  ready: boolean
  error?: string
}

export async function loader({ context, request }: LoaderArgs): Promise<LoaderData> {
  const env = context.env as Record<string, string>
  const accountId = env.CF_ACCOUNT_ID
  const token = env.CF_IMAGES_TOKEN

  if (!accountId || !token) {
    return {
      variants: [],
      missing: ['thumbnail', 'display'],
      ready: false,
      error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN',
    }
  }

  try {
    // Fetch variants from Cloudflare API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/variants`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json() as {
      success: boolean
      result?: { variants: Record<string, Variant> }
      errors?: Array<{ message: string }>
    }

    if (!data.success) {
      return {
        variants: [],
        missing: ['thumbnail', 'display'],
        ready: false,
        error: data.errors?.[0]?.message || 'Failed to fetch variants',
      }
    }

    const variants = Object.values(data.result?.variants || {})
    const existingIds = variants.map((v) => v.id)
    const requiredIds = ['thumbnail', 'display']
    const missing = requiredIds.filter((id) => !existingIds.includes(id))

    return {
      variants,
      missing,
      ready: missing.length === 0,
    }
  } catch (err) {
    return {
      variants: [],
      missing: ['thumbnail', 'display'],
      ready: false,
      error: err instanceof Error ? err.message : 'Failed to fetch variants',
    }
  }
}

export default function VariantsPage(props: PageProps & LoaderData) {
  const variants = Array.isArray(props.variants) ? props.variants : []
  const missing = Array.isArray(props.missing) ? props.missing : []
  const ready = props.ready
  const error = props.error

  return (
    <main class="min-h-screen p-8 max-w-4xl mx-auto">
      <div class="mb-8">
        <a
          href="/hosted"
          class="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block"
        >
          &larr; Back to Hosted Images
        </a>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Image Variants
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Variants are global image transformations. Create them once, use them for all images.
        </p>
      </div>

      {error && (
        <div class="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Status */}
      <div class={`mb-8 p-4 rounded-lg border ${
        ready
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        {ready ? (
          <p class="text-sm text-green-800 dark:text-green-200">
            ✓ All required variants are configured! You can now upload images.
          </p>
        ) : (
          <div>
            <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              Missing variants: {missing.join(', ')}
            </p>
            <form method="post" action="/hosted/variants">
              <button
                type="submit"
                class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create Missing Variants
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Existing Variants */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Existing Variants ({variants.length})
        </h2>

        {variants.length === 0 ? (
          <p class="text-gray-500 dark:text-gray-400 text-sm">No variants found.</p>
        ) : (
          <div class="space-y-4">
            {variants.map((variant) => (
              <div
                key={variant.id}
                class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <h3 class="font-medium text-gray-900 dark:text-gray-100">
                  {variant.id}
                  {['thumbnail', 'display'].includes(variant.id) && (
                    <span class="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </h3>
                <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {variant.options.width && variant.options.height && (
                    <span class="mr-4">{variant.options.width}×{variant.options.height}</span>
                  )}
                  {variant.options.fit && (
                    <span class="mr-4">fit: {variant.options.fit}</span>
                  )}
                  {variant.neverRequireSignedURLs && (
                    <span class="text-green-600 dark:text-green-400">public</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Required Variants Info */}
      <div class="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Required Variants</h3>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li><strong>thumbnail</strong> - 128×128, cover fit (for grid display)</li>
          <li><strong>display</strong> - 1280×720, contain fit (for dialog preview)</li>
        </ul>
      </div>
    </main>
  )
}
