import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { createImageClient } from '@cloudwerk/images'
import ImageGrid from '../components/image-grid'

interface ImageItem {
    id: string
    thumbnailUrl: string
    displayUrl: string
    filename?: string
}

interface LoaderData {
    images: ImageItem[]
    error?: string
}

/**
 * Build an imagedelivery.net URL for a Cloudflare Images image.
 * Format: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>
 */
function buildImageUrl(accountHash: string, imageId: string, variant: string): string {
    return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`
}

export async function loader({ context }: LoaderArgs): Promise<LoaderData> {
    const env = context.env as Record<string, string>
    const accountId = env.CF_ACCOUNT_ID
    const accountHash = env.CF_ACCOUNT_HASH
    const token = env.CF_IMAGES_TOKEN

    if (!accountId || !token) {
        return {
            images: [],
            error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN. Configure in wrangler.toml [vars].',
        }
    }

    if (!accountHash) {
        return {
            images: [],
            error: 'Missing CF_ACCOUNT_HASH. Get it from Cloudflare Dashboard > Images > Overview.',
        }
    }

    const client = createImageClient(accountId, token)

    try {
        const result = await client.list({ perPage: 50 })

        return {
            images: result.map((img) => ({
                id: img.id,
                thumbnailUrl: buildImageUrl(accountHash, img.id, 'thumbnail'),
                displayUrl: buildImageUrl(accountHash, img.id, 'display'),
                filename: img.filename,
            })),
        }
    } catch (err) {
        return {
            images: [],
            error: err instanceof Error ? err.message : 'Failed to load images',
        }
    }
}

export default function HostedPage(props: PageProps & LoaderData) {
    // Ensure images is always an array (defensive)
    const images = Array.isArray(props.images) ? props.images : []
    const error = props.error

    return (
        <main class="min-h-screen p-8 max-w-6xl mx-auto">
            <div class="mb-8">
                <a
                    href="/"
                    class="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block"
                >
                    &larr; Back to Home
                </a>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Hosted Images
                </h1>
                <p class="text-gray-600 dark:text-gray-400 mt-2">
                    Upload images to Cloudflare Images. View thumbnails and click for full display.
                </p>
            </div>

            {error && (
                <div class="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p class="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
                </div>
            )}

            {/* Setup Info */}
            <div class="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 class="font-medium text-blue-800 dark:text-blue-200 mb-2">Setup Required:</h3>
                <ol class="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1 mb-3">
                    <li>Set CF_ACCOUNT_HASH and CF_IMAGES_TOKEN in wrangler.toml</li>
                    <li>Create "thumbnail" and "display" variants (one-time setup)</li>
                </ol>
                <div class="flex gap-2">
                    <a
                        href="/hosted/variants"
                        class="inline-block px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Check Variants
                    </a>
                </div>
            </div>

            {/* Upload Form */}
            <form
                method="post"
                action="/hosted"
                enctype="multipart/form-data"
                class="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
            >
                <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                    <div class="flex-1">
                        <label
                            for="image"
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                            Select an image
                        </label>
                        <input
                            type="file"
                            id="image"
                            name="image"
                            accept="image/*"
                            required
                            class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/20 dark:file:text-orange-400"
                        />
                    </div>
                    <button
                        type="submit"
                        class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                    >
                        Upload
                    </button>
                </div>
            </form>

            {/* Image Grid */}
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Your Images
                </h2>
                <ImageGrid images={images} />
            </div>
        </main>
    )
}
