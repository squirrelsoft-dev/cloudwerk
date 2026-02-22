import { defineConfig } from '@cloudwerk/core'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  ui: {
    renderer: 'react',
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
