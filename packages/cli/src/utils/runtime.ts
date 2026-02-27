export type Runtime = 'bun' | 'node'

const isBun = typeof globalThis.Bun !== 'undefined';

export function detectRuntime(): Runtime {
  return isBun ? 'bun' : 'node';
}

export function getRuntimeVersion(): string {
  if (isBun) {
    const version = (globalThis.Bun as { version?: string })?.version;
    return `Bun ${version ?? 'unknown'}`;
  }
  return `Node ${process.versions.node}`;
}
