/**
 * Integration Test Utilities
 *
 * Provides helpers for creating and managing test Vite dev servers
 * with Cloudwerk plugin for integration testing.
 */

import { createServer, type ViteDevServer } from 'vite'
import devServer from '@hono/vite-dev-server'
import * as path from 'node:path'
import { cloudwerkPlugin } from '../../plugin.js'

/**
 * Test server instance with helper methods.
 */
export interface TestServer {
  /** Underlying Vite dev server */
  server: ViteDevServer
  /** Port the server is listening on */
  port: number
  /** Base URL of the server */
  baseUrl: string
  /** Make a fetch request to the server */
  fetch: (path: string, init?: RequestInit) => Promise<Response>
  /** Close the server */
  close: () => Promise<void>
}

/**
 * Get the fixtures directory path.
 */
function getFixturesDir(): string {
  return path.resolve(import.meta.dirname, 'fixtures')
}

/**
 * Create a test server for a given fixture.
 *
 * @param fixtureName - Name of the fixture directory in fixtures/
 * @returns Test server instance with helper methods
 *
 * @example
 * ```typescript
 * const server = await createTestServer('basic-app')
 * const response = await server.fetch('/api/health')
 * expect(response.status).toBe(200)
 * await server.close()
 * ```
 */
export async function createTestServer(fixtureName: string): Promise<TestServer> {
  const fixtureDir = path.join(getFixturesDir(), fixtureName)

  // Create Vite server with Cloudwerk plugin
  const server = await createServer({
    root: fixtureDir,
    mode: 'development',
    logLevel: 'silent',
    server: {
      port: 0, // Let OS assign available port
      strictPort: false,
      host: 'localhost',
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'hono/jsx',
    },
    plugins: [
      cloudwerkPlugin({
        verbose: false,
      }),
      devServer({
        entry: 'virtual:cloudwerk/server-entry',
      }),
    ],
  })

  // Start listening
  await server.listen()

  // Get the resolved port
  const addressInfo = server.httpServer?.address()
  if (!addressInfo || typeof addressInfo === 'string') {
    await server.close()
    throw new Error('Failed to get server address')
  }

  const port = addressInfo.port
  const baseUrl = `http://localhost:${port}`

  // Create fetch helper bound to this server
  const fetchFn = (urlPath: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(urlPath, baseUrl)
    return fetch(url.toString(), init)
  }

  // Create close helper
  const closeFn = async (): Promise<void> => {
    await server.close()
  }

  return {
    server,
    port,
    baseUrl,
    fetch: fetchFn,
    close: closeFn,
  }
}

/**
 * Helper to wait for server to be ready.
 *
 * @param server - Test server to wait for
 * @param timeoutMs - Maximum time to wait in milliseconds
 */
export async function waitForServerReady(
  server: TestServer,
  timeoutMs = 5000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await server.fetch('/')
      if (response.status !== 502) {
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms`)
}
