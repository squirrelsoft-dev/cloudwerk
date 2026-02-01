import { defineImage } from '@cloudwerk/images'

export default defineImage({
  variants: {
    thumbnail: { width: 128, height: 128, fit: 'cover' },
    display: { width: 1280, height: 720, fit: 'contain' },
  },
})
