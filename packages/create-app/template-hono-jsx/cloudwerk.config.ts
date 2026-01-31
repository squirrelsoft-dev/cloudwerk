import { defineConfig } from '@cloudwerk/core'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  ui: {
    renderer: 'hono-jsx',
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
