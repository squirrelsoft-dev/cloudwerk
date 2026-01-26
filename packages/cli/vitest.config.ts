import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@cloudwerk/core'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/**/__fixtures__/**',
      ],
      thresholds: {
        // Lower thresholds for now - dev.ts and index.ts are difficult to unit test
        // as they require starting a real server. Integration tests will cover these.
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
})
