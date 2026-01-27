#!/usr/bin/env npx tsx
/**
 * Validate that all modified packages have corresponding changesets.
 *
 * This script:
 * 1. Detects which packages have changes (vs main branch)
 * 2. Reads all changeset files
 * 3. Ensures every changed package is mentioned in at least one changeset
 *
 * Run: npx tsx scripts/validate-changesets.ts
 */

import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

// ANSI colors
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

// Packages to check
const PACKAGES = [
  { name: '@cloudwerk/core', path: 'packages/core' },
  { name: '@cloudwerk/ui', path: 'packages/ui' },
  { name: '@cloudwerk/cli', path: 'packages/cli' },
  { name: '@cloudwerk/create-app', path: 'apps/create-cloudwerk-app' },
]

// Files that don't require changesets
const IGNORED_PATTERNS = [
  /\.test\.ts$/,
  /\.test\.tsx$/,
  /\.spec\.ts$/,
  /__tests__\//,
  /__fixtures__\//,
  /\.md$/,
  /\.json$/, // package.json changes handled by changesets
]

function runGit(args: string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf-8' })
  if (result.error) {
    throw result.error
  }
  return result.stdout || ''
}

function getChangedFiles(): string[] {
  try {
    // Get changes compared to main branch
    const diff = runGit(['diff', '--name-only', 'origin/main...HEAD'])
    return diff.trim().split('\n').filter(Boolean)
  } catch {
    // Fallback: check uncommitted changes
    const diff = runGit(['diff', '--name-only', 'HEAD'])
    return diff.trim().split('\n').filter(Boolean)
  }
}

function getChangedPackages(changedFiles: string[]): Set<string> {
  const changedPackages = new Set<string>()

  for (const file of changedFiles) {
    // Skip ignored patterns
    if (IGNORED_PATTERNS.some((pattern) => pattern.test(file))) {
      continue
    }

    // Check which package this file belongs to
    for (const pkg of PACKAGES) {
      if (file.startsWith(pkg.path + '/')) {
        changedPackages.add(pkg.name)
        break
      }
    }
  }

  return changedPackages
}

function getPackagesInChangesets(): Set<string> {
  const changesetDir = path.join(process.cwd(), '.changeset')
  const packagesInChangesets = new Set<string>()

  if (!fs.existsSync(changesetDir)) {
    return packagesInChangesets
  }

  const files = fs.readdirSync(changesetDir)

  for (const file of files) {
    if (!file.endsWith('.md') || file === 'README.md' || file === 'config.json') {
      continue
    }

    const content = fs.readFileSync(path.join(changesetDir, file), 'utf-8')

    // Parse YAML frontmatter to find package names
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      // Match package names in quotes
      const packageMatches = frontmatter.matchAll(/"(@cloudwerk\/[^"]+)":/g)
      for (const match of packageMatches) {
        packagesInChangesets.add(match[1])
      }
    }
  }

  return packagesInChangesets
}

function main() {
  console.log('Validating changesets...\n')

  // Get changed files
  const changedFiles = getChangedFiles()
  if (changedFiles.length === 0) {
    console.log(`${GREEN}✓${RESET} No changed files detected`)
    process.exit(0)
  }

  console.log(`Found ${changedFiles.length} changed files`)

  // Get changed packages
  const changedPackages = getChangedPackages(changedFiles)
  if (changedPackages.size === 0) {
    console.log(`${GREEN}✓${RESET} No packages with meaningful changes`)
    process.exit(0)
  }

  console.log(`Changed packages: ${Array.from(changedPackages).join(', ')}\n`)

  // Get packages mentioned in changesets
  const packagesInChangesets = getPackagesInChangesets()
  console.log(
    `Packages in changesets: ${Array.from(packagesInChangesets).join(', ') || '(none)'}\n`
  )

  // Find missing changesets
  const missingChangesets: string[] = []
  for (const pkg of changedPackages) {
    if (!packagesInChangesets.has(pkg)) {
      missingChangesets.push(pkg)
    }
  }

  if (missingChangesets.length > 0) {
    console.log(`${RED}✗${RESET} Missing changesets for:`)
    for (const pkg of missingChangesets) {
      console.log(`  - ${pkg}`)
    }
    console.log(`\n${YELLOW}Run 'pnpm changeset' to add a changeset for these packages${RESET}`)
    process.exit(1)
  }

  console.log(`${GREEN}✓${RESET} All changed packages have changesets`)
  process.exit(0)
}

main()
