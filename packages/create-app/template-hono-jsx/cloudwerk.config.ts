import { defineConfig } from '@cloudwerk/core'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  ui: {
    renderer: 'hono-jsx',
  },
  vite: {
    plugins: [tsconfigPaths(), tailwindcss()],
  },
})
