export type Runtime = 'bun' | 'node'

export function detectRuntime(): Runtime {
  if (typeof globalThis.Bun !== 'undefined') return 'bun'
  return 'node'
}

export function getRuntimeVersion(): string {
  if (typeof globalThis.Bun !== 'undefined') return `Bun ${(globalThis.Bun as any).version}`
  return `Node ${process.versions.node}`
}
