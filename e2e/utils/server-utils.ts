/**
 * E2E Test Utilities - Server Management
 *
 * Utilities for spawning, waiting, and stopping dev servers during E2E tests.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'

// ============================================================================
// Port Allocation
// ============================================================================

/**
 * Find an available port in the given range.
 *
 * @param start - Start of port range (inclusive)
 * @param end - End of port range (inclusive)
 * @returns Available port number
 * @throws Error if no port available in range
 */
export async function findAvailablePort(start: number, end: number): Promise<number> {
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port)
    if (available) {
      return port
    }
  }
  throw new Error(`No available port found in range ${start}-${end}`)
}

/**
 * Check if a port is available.
 *
 * @param port - Port to check
 * @returns True if port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port)
  })
}

// ============================================================================
// Server Management
// ============================================================================

/**
 * Start a dev server using spawn (not exec for security).
 *
 * @param projectDir - Directory containing the project
 * @param port - Port for the dev server
 * @returns Child process handle
 */
export function startServer(projectDir: string, port: number): ChildProcess {
  const serverProcess = spawn('pnpm', ['dev', '--port', String(port)], {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  // Log server output for debugging
  serverProcess.stdout?.on('data', (data: Buffer) => {
    if (process.env.E2E_DEBUG) {
      console.log(`[server stdout]: ${data.toString().trim()}`)
    }
  })

  serverProcess.stderr?.on('data', (data: Buffer) => {
    if (process.env.E2E_DEBUG) {
      console.error(`[server stderr]: ${data.toString().trim()}`)
    }
  })

  return serverProcess
}

/**
 * Wait for a server to be ready by polling a health check URL.
 *
 * @param url - URL to poll
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Polling interval in milliseconds
 * @throws Error if server doesn't respond within timeout
 */
export async function waitForServer(
  url: string,
  timeout: number = 15000,
  interval: number = 500
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) {
        // Server is responding (404 is fine, means server is up)
        return
      }
    } catch {
      // Server not ready yet, continue polling
    }

    await sleep(interval)
  }

  throw new Error(`Server did not respond at ${url} within ${timeout}ms`)
}

/**
 * Stop a server process gracefully.
 *
 * @param serverProcess - Child process to stop
 * @param timeout - Maximum time to wait for graceful shutdown
 */
export async function stopServer(
  serverProcess: ChildProcess,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess.pid) {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      // Force kill if graceful shutdown takes too long
      serverProcess.kill('SIGKILL')
      resolve()
    }, timeout)

    serverProcess.once('exit', () => {
      clearTimeout(timeoutId)
      resolve()
    })

    // Send SIGTERM for graceful shutdown
    serverProcess.kill('SIGTERM')
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for a given duration.
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run a command using spawn and wait for completion.
 *
 * @param cmd - Command to run
 * @param args - Command arguments
 * @param options - Spawn options
 * @returns Exit code
 * @throws Error if command fails
 */
export async function runCommand(
  cmd: string,
  args: string[],
  options: { cwd: string }
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: options.cwd,
      stdio: process.env.E2E_DEBUG ? 'inherit' : 'pipe',
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to execute ${cmd}: ${error.message}`))
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command "${cmd} ${args.join(' ')}" failed with exit code ${code}`))
      }
    })
  })
}
