/**
 * E2E Test Configuration
 *
 * Vitest configuration for end-to-end tests with longer timeouts
 * and sequential test execution.
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    // E2E tests need longer timeouts
    testTimeout: 60000,
    hookTimeout: 60000,

    // Run tests sequentially to avoid port conflicts
    sequence: {
      concurrent: false,
    },

    // Include only e2e test files
    include: ['**/*.test.ts'],

    // Node environment for server testing
    environment: 'node',

    // Global test APIs
    globals: true,

    // Root directory for test resolution
    root: resolve(__dirname),
  },

  // Resolve TypeScript paths
  resolve: {
    alias: {
      // Allow importing from packages/create-app/src
    },
  },
})
