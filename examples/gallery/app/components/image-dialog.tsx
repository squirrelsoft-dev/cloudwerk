'use client'

import { useState, useEffect } from 'hono/jsx'

interface ImageDialogProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageDialog({ src, alt, isOpen, onClose }: ImageDialogProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div class="relative max-w-[90vw] max-h-[90vh]">
        <button
          onClick={onClose}
          class="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <img
          src={src}
          alt={alt}
          class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e: MouseEvent) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
