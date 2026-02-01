'use client'

import { useState } from 'hono/jsx'
import ImageDialog from './image-dialog'

interface ImageItem {
    id: string
    thumbnailUrl: string
    displayUrl: string
    filename?: string
}

interface ImageGridProps {
    images: ImageItem[]
}

export default function ImageGrid({ images = [] }: ImageGridProps) {
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)

    // Ensure images is always an array
    const safeImages = Array.isArray(images) ? images : []

    if (safeImages.length === 0) {
        return (
            <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                No images yet. Upload one above!
            </div>
        )
    }

    return (
        <>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {safeImages.map((image) => (
                    <button
                        key={image.id}
                        onClick={() => setSelectedImage(image)}
                        class="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-orange-500 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <img
                            src={image.thumbnailUrl}
                            alt={image.filename || image.id}
                            class="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </button>
                ))}
            </div>

            <ImageDialog
                src={selectedImage?.displayUrl || ''}
                alt={selectedImage?.filename || selectedImage?.id || ''}
                isOpen={selectedImage !== null}
                onClose={() => setSelectedImage(null)}
            />
        </>
    )
}
