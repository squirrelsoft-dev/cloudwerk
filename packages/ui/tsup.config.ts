import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/client.ts'],
  format: ['esm'],
  dts: true,
  external: ['@cloudwerk/core', 'hono', 'hono/jsx', 'hono/jsx/dom', 'hono/jsx/streaming'],
})
