/**
 * create-cloudwerk-app - Scaffolding Functions
 *
 * Project scaffolding and template processing.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import { validateProject } from './validate.js'
import { logger, detectPackageManager, printSuccessBanner } from './utils.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Current workspace package version for cloudwerk packages.
 */
const PACKAGE_VERSION = '0.0.1'

/**
 * Get the template directory path.
 */
function getTemplateDir(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  // In dist, go up one level then to template
  return path.resolve(__dirname, '..', 'template')
}

// ============================================================================
// Template Processing
// ============================================================================

/**
 * Template placeholder values.
 */
interface TemplateValues {
  name: string
  coreVersion: string
  cliVersion: string
}

/**
 * Process a template file by replacing placeholders.
 *
 * @param content - File content with placeholders
 * @param values - Values to replace placeholders with
 * @returns Processed content
 */
function processTemplate(content: string, values: TemplateValues): string {
  return content
    .replace(/\{\{name\}\}/g, values.name)
    .replace(/\{\{coreVersion\}\}/g, values.coreVersion)
    .replace(/\{\{cliVersion\}\}/g, values.cliVersion)
}

/**
 * Check if a file is a template file that needs processing.
 *
 * @param fileName - Name of the file
 * @returns True if file is a template
 */
function isTemplateFile(fileName: string): boolean {
  return fileName.endsWith('.tmpl')
}

/**
 * Get the output filename for a file, handling special cases.
 *
 * @param fileName - Original file name
 * @returns Output file name
 */
function getOutputFileName(fileName: string): string {
  // Rename _gitignore to .gitignore
  if (fileName === '_gitignore') {
    return '.gitignore'
  }

  // Remove .tmpl extension
  if (fileName.endsWith('.tmpl')) {
    return fileName.slice(0, -5)
  }

  return fileName
}

// ============================================================================
// Scaffolding
// ============================================================================

/**
 * Options for the scaffold function.
 */
export interface ScaffoldOptions {
  /** Target directory for the project (defaults to cwd + projectName) */
  targetDir?: string
}

/**
 * Scaffold a new Cloudwerk project.
 *
 * @param projectName - Name of the project
 * @param options - Scaffold options
 * @throws Error if validation fails or scaffolding encounters an error
 */
export async function scaffold(
  projectName: string,
  options: ScaffoldOptions = {}
): Promise<void> {
  // Determine target directory
  const targetDir = options.targetDir || path.resolve(process.cwd(), projectName)

  // Validate project
  const validation = validateProject(projectName, targetDir)
  if (!validation.valid) {
    throw new Error(validation.error!)
  }

  const templateDir = getTemplateDir()

  // Check template directory exists
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`)
  }

  const templateValues: TemplateValues = {
    name: projectName,
    coreVersion: PACKAGE_VERSION,
    cliVersion: PACKAGE_VERSION,
  }

  logger.info(`Creating ${projectName}...`)

  try {
    // Create target directory
    await fs.ensureDir(targetDir)

    // Copy and process template files
    await copyTemplateRecursive(templateDir, targetDir, templateValues)

    // Detect package manager and print success
    const pm = detectPackageManager()
    printSuccessBanner(projectName, targetDir, pm)
  } catch (error) {
    // Cleanup on failure - try to remove partially created directory
    if (fs.existsSync(targetDir)) {
      try {
        await fs.remove(targetDir)
      } catch {
        // Ignore cleanup errors, re-throw original error
      }
    }

    // Re-throw for CLI to handle
    throw error
  }
}

/**
 * Recursively copy and process template files.
 *
 * @param srcDir - Source directory (template)
 * @param destDir - Destination directory (project)
 * @param values - Template values for placeholders
 */
async function copyTemplateRecursive(
  srcDir: string,
  destDir: string,
  values: TemplateValues
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const outputName = getOutputFileName(entry.name)
    const destPath = path.join(destDir, outputName)

    if (entry.isDirectory()) {
      // Recursively copy directories
      await fs.ensureDir(destPath)
      await copyTemplateRecursive(srcPath, destPath, values)
    } else if (entry.isFile()) {
      if (isTemplateFile(entry.name)) {
        // Process template files
        const content = await fs.readFile(srcPath, 'utf-8')
        const processed = processTemplate(content, values)
        await fs.writeFile(destPath, processed, 'utf-8')
      } else {
        // Copy non-template files directly
        await fs.copyFile(srcPath, destPath)
      }
    }
  }
}
