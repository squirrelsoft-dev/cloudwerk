import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import cloudwerk from '@cloudwerk/vite-plugin'

export default defineConfig({
  plugins: [
    cloudwerk({ verbose: true }),
    devServer({ entry: 'virtual:cloudwerk/server-entry' }),
  ],
})
