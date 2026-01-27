#!/usr/bin/env npx tsx
/**
 * Validate that all cross-package imports are properly exported.
 *
 * This script:
 * 1. Finds all imports from @cloudwerk/* packages
 * 2. Checks that those imports exist in the package's exports
 * 3. Reports any imports that don't exist (would fail at runtime with published packages)
 *
 * Run: npx tsx scripts/validate-cross-package-imports.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ANSI colors
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

// Package configurations
const PACKAGES: Record<string, { path: string; entryPoint: string }> = {
  '@cloudwerk/core': {
    path: 'packages/core',
    entryPoint: 'packages/core/src/index.ts',
  },
  '@cloudwerk/ui': {
    path: 'packages/ui',
    entryPoint: 'packages/ui/src/index.ts',
  },
  '@cloudwerk/cli': {
    path: 'packages/cli',
    entryPoint: 'packages/cli/src/index.ts',
  },
}

// Cache for package exports
const exportCache = new Map<string, Set<string>>()

/**
 * Get all exports from a package's entry point.
 */
function getPackageExports(packageName: string): Set<string> {
  if (exportCache.has(packageName)) {
    return exportCache.get(packageName)!
  }

  const config = PACKAGES[packageName]
  if (!config) {
    return new Set()
  }

  const entryPath = path.join(process.cwd(), config.entryPoint)
  if (!fs.existsSync(entryPath)) {
    console.warn(`${YELLOW}Warning: Entry point not found: ${entryPath}${RESET}`)
    return new Set()
  }

  let content = fs.readFileSync(entryPath, 'utf-8')

  // Remove single-line comments to avoid parsing issues
  content = content.replace(/\/\/[^\n]*/g, '')
  // Remove multi-line comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '')

  const exports = new Set<string>()

  // Match named exports: export { foo, bar } from '...'
  const namedExportMatches = content.matchAll(
    /export\s*\{([^}]+)\}\s*from/g
  )
  for (const match of namedExportMatches) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
      .map((n) => {
        // Handle "foo as bar" syntax - take the exported name (bar)
        const parts = n.split(/\s+as\s+/)
        return parts[parts.length - 1].trim()
      })
    for (const name of names) {
      if (name && /^\w+$/.test(name)) exports.add(name)
    }
  }

  // Match type exports: export type { Foo } from '...'
  const typeExportMatches = content.matchAll(
    /export\s+type\s*\{([^}]+)\}\s*from/g
  )
  for (const match of typeExportMatches) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
      .map((n) => {
        const parts = n.split(/\s+as\s+/)
        return parts[parts.length - 1].trim()
      })
    for (const name of names) {
      if (name && /^\w+$/.test(name)) exports.add(name)
    }
  }

  // Match direct exports: export function foo, export const bar, export class Baz
  const directExportMatches = content.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/g
  )
  for (const match of directExportMatches) {
    exports.add(match[1])
  }

  // Match default export
  if (/export\s+default/.test(content)) {
    exports.add('default')
  }

  exportCache.set(packageName, exports)
  return exports
}

interface ImportIssue {
  file: string
  line: number
  packageName: string
  importedNames: string[]
  missingNames: string[]
}

/**
 * Determine which package a file belongs to.
 */
function getFilePackage(filePath: string): string | null {
  for (const [packageName, config] of Object.entries(PACKAGES)) {
    const packageDir = path.join(process.cwd(), config.path)
    if (filePath.startsWith(packageDir)) {
      return packageName
    }
  }
  return null
}

/**
 * Find all cross-package imports in a file.
 */
function findCrossPackageImports(filePath: string): ImportIssue[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: ImportIssue[] = []

  // Get the package this file belongs to
  const sourcePackage = getFilePackage(filePath)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match imports from @cloudwerk packages
    // import { foo, bar } from '@cloudwerk/core'
    // import type { Foo } from '@cloudwerk/core'
    const importMatch = line.match(
      /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](@cloudwerk\/[^'"]+)['"]/
    )

    if (importMatch) {
      const importedNames = importMatch[1]
        .split(',')
        .map((n) => {
          // Handle "foo as bar" syntax - take the imported name (foo)
          const parts = n.trim().split(/\s+as\s+/)
          return parts[0].trim()
        })
        .filter(Boolean)

      const packageName = importMatch[2]

      // Skip if not a known package
      if (!PACKAGES[packageName]) {
        continue
      }

      // Skip if importing from the same package (internal imports are fine)
      if (packageName === sourcePackage) {
        continue
      }

      // Get package exports
      const packageExports = getPackageExports(packageName)

      // Find missing exports
      const missingNames = importedNames.filter((name) => !packageExports.has(name))

      if (missingNames.length > 0) {
        issues.push({
          file: filePath,
          line: i + 1,
          packageName,
          importedNames,
          missingNames,
        })
      }
    }
  }

  return issues
}

/**
 * Recursively find all TypeScript files in a directory.
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        continue
      }
      files.push(...findTypeScriptFiles(fullPath))
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

function main() {
  console.log('Validating cross-package imports...\n')

  const allIssues: ImportIssue[] = []

  // Check each package
  for (const [packageName, config] of Object.entries(PACKAGES)) {
    const srcDir = path.join(process.cwd(), config.path, 'src')
    const files = findTypeScriptFiles(srcDir)

    console.log(`Checking ${CYAN}${packageName}${RESET} (${files.length} files)`)

    for (const file of files) {
      const issues = findCrossPackageImports(file)
      allIssues.push(...issues)
    }
  }

  console.log()

  if (allIssues.length === 0) {
    console.log(`${GREEN}✓${RESET} All cross-package imports are valid`)
    process.exit(0)
  }

  console.log(`${RED}✗${RESET} Found ${allIssues.length} import issues:\n`)

  for (const issue of allIssues) {
    const relativePath = path.relative(process.cwd(), issue.file)
    console.log(`${CYAN}${relativePath}:${issue.line}${RESET}`)
    console.log(`  Package: ${issue.packageName}`)
    console.log(`  Missing exports: ${RED}${issue.missingNames.join(', ')}${RESET}`)
    console.log()
  }

  console.log(
    `${YELLOW}These imports will fail at runtime when using published packages.${RESET}`
  )
  console.log(
    `${YELLOW}Ensure these exports are added to the package's index.ts and included in a changeset.${RESET}`
  )

  process.exit(1)
}

main()
