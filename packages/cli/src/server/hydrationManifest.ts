/**
 * @cloudwerk/cli - Hydration Manifest
 *
 * Tracks client components discovered during route registration
 * and manages the hydration manifest for script injection.
 */

import * as fs from 'node:fs'
import type { HydrationManifest } from '@cloudwerk/core'
import { createHydrationManifest, addToHydrationManifest, hasUseClientDirective, generateComponentId } from '@cloudwerk/core'

// ============================================================================
// Types
// ============================================================================

/**
 * Tracked client component information.
 */
export interface TrackedClientComponent {
  /** Absolute file path */
  filePath: string
  /** Generated component ID */
  componentId: string
  /** Export name (default or named) */
  exportName: string
  /** Whether the component has been bundled */
  bundled: boolean
}

/**
 * Hydration manifest tracker for managing client components.
 */
export interface HydrationManifestTracker {
  /** All tracked client components */
  components: Map<string, TrackedClientComponent>
  /** Base path for client bundles */
  basePath: string
  /** App directory for component ID generation */
  appDir: string
}

// ============================================================================
// Manifest Tracker
// ============================================================================

/**
 * Create a new hydration manifest tracker.
 *
 * @param appDir - App directory for component ID generation
 * @param basePath - Base path for client bundles
 * @returns Hydration manifest tracker
 */
export function createManifestTracker(
  appDir: string,
  basePath: string = '/__cloudwerk'
): HydrationManifestTracker {
  return {
    components: new Map(),
    basePath,
    appDir,
  }
}

/**
 * Check if a file is a client component and track it if so.
 *
 * @param tracker - Hydration manifest tracker
 * @param filePath - Absolute file path to check
 * @returns True if the file is a client component
 */
export function trackIfClientComponent(
  tracker: HydrationManifestTracker,
  filePath: string
): boolean {
  // Skip if already tracked
  if (tracker.components.has(filePath)) {
    return true
  }

  // Read the file and check for 'use client' directive
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    if (hasUseClientDirective(content)) {
      const componentId = generateComponentId(filePath, tracker.appDir)
      tracker.components.set(filePath, {
        filePath,
        componentId,
        exportName: 'default',
        bundled: false,
      })
      return true
    }
  } catch (error) {
    // File read error - not a client component
    return false
  }

  return false
}

/**
 * Check if a file is a client component without tracking.
 *
 * @param filePath - Absolute file path to check
 * @returns True if the file is a client component
 */
export function isClientComponent(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return hasUseClientDirective(content)
  } catch {
    return false
  }
}

/**
 * Mark a component as bundled.
 *
 * @param tracker - Hydration manifest tracker
 * @param filePath - Absolute file path of the component
 */
export function markAsBundled(tracker: HydrationManifestTracker, filePath: string): void {
  const component = tracker.components.get(filePath)
  if (component) {
    component.bundled = true
  }
}

/**
 * Get all unbundled client components.
 *
 * @param tracker - Hydration manifest tracker
 * @returns Array of file paths for unbundled components
 */
export function getUnbundledComponents(tracker: HydrationManifestTracker): string[] {
  const unbundled: string[] = []
  for (const [filePath, component] of tracker.components) {
    if (!component.bundled) {
      unbundled.push(filePath)
    }
  }
  return unbundled
}

/**
 * Get all tracked client component file paths.
 *
 * @param tracker - Hydration manifest tracker
 * @returns Array of all tracked component file paths
 */
export function getAllTrackedComponents(tracker: HydrationManifestTracker): string[] {
  return Array.from(tracker.components.keys())
}

/**
 * Convert tracker to hydration manifest.
 *
 * @param tracker - Hydration manifest tracker
 * @returns Hydration manifest for script generation
 */
export function toHydrationManifest(tracker: HydrationManifestTracker): HydrationManifest {
  const manifest = createHydrationManifest(tracker.basePath)

  for (const component of tracker.components.values()) {
    addToHydrationManifest(
      manifest,
      {
        filePath: component.filePath,
        componentId: component.componentId,
        exportName: component.exportName,
      },
      `${tracker.basePath}/${component.componentId}.js`
    )
  }

  return manifest
}

/**
 * Create a request-scoped manifest with only the components used in the current request.
 *
 * @param tracker - Global hydration manifest tracker
 * @param usedComponentIds - Set of component IDs used in the current request
 * @returns Request-scoped hydration manifest
 */
export function createRequestScopedManifest(
  tracker: HydrationManifestTracker,
  usedComponentIds: Set<string>
): HydrationManifest {
  const manifest = createHydrationManifest(tracker.basePath)

  for (const component of tracker.components.values()) {
    if (usedComponentIds.has(component.componentId)) {
      addToHydrationManifest(
        manifest,
        {
          filePath: component.filePath,
          componentId: component.componentId,
          exportName: component.exportName,
        },
        `${tracker.basePath}/${component.componentId}.js`
      )
    }
  }

  return manifest
}

// ============================================================================
// Component ID Lookup
// ============================================================================

/**
 * Get component ID by file path.
 *
 * @param tracker - Hydration manifest tracker
 * @param filePath - Absolute file path
 * @returns Component ID or undefined if not tracked
 */
export function getComponentId(
  tracker: HydrationManifestTracker,
  filePath: string
): string | undefined {
  return tracker.components.get(filePath)?.componentId
}

/**
 * Get component info by component ID.
 *
 * @param tracker - Hydration manifest tracker
 * @param componentId - Component ID to look up
 * @returns Component info or undefined if not found
 */
export function getComponentByIdFromTracker(
  tracker: HydrationManifestTracker,
  componentId: string
): TrackedClientComponent | undefined {
  for (const component of tracker.components.values()) {
    if (component.componentId === componentId) {
      return component
    }
  }
  return undefined
}
