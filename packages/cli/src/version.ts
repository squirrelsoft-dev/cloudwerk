/**
 * @cloudwerk/cli - Version
 *
 * Exports the package version from package.json.
 */

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

/**
 * Package version from package.json.
 */
export const VERSION = pkg.version
