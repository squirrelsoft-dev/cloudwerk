import type { PageProps } from '@cloudwerk/core'
import { GALLERY_BUCKET } from '@cloudwerk/core/bindings'
import ImageGrid from '../components/image-grid'

interface R2Object {
    key: string
    customMetadata?: Record<string, string>
}

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

export async function loader(): Promise<LoaderData> {
    if (!GALLERY_BUCKET) {
        return {
            images: [],
            error: 'GALLERY_BUCKET binding not configured. Make sure R2 bucket is set up in wrangler.toml.',
        }
    }

    try {
        const result = await GALLERY_BUCKET.list()

        const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif']
        const images = result.objects
            .filter((obj: R2Object) => imageExtensions.some(ext => obj.key.endsWith(ext)))
            .map((obj: R2Object) => ({
                id: obj.key,
                thumbnailUrl: `/r2/${encodeURIComponent(obj.key)}?type=thumbnail`,
                displayUrl: `/r2/${encodeURIComponent(obj.key)}?type=display`,
                filename: obj.customMetadata?.originalName,
            }))

        return { images }
    } catch (err) {
        return {
            images: [],
            error: err instanceof Error ? err.message : 'Failed to list images',
        }
    }
}

export default function R2Page(props: PageProps & LoaderData) {
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
                    R2 + IMAGES Binding
                </h1>
                <p class="text-gray-600 dark:text-gray-400 mt-2">
                    Upload images to R2 and serve with on-the-fly transformations.
                </p>
            </div>

            {error && (
                <div class="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p class="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
                </div>
            )}

            {/* Info Card */}
            <div class="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 class="font-medium text-blue-800 dark:text-blue-200 mb-1">How it works:</h3>
                <ol class="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                    <li>Upload: Image is converted to WebP and stored in R2</li>
                    <li>Thumbnail: Resized to 128x128 on-the-fly via IMAGES binding</li>
                    <li>Display: Resized to 1280x720 on-the-fly via IMAGES binding</li>
                </ol>
            </div>

            {/* Upload Form */}
            <form
                method="post"
                action="/r2"
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
                    Images in R2
                </h2>
                <ImageGrid images={images} />
            </div>
        </main>
    )
}
