# @cloudwerk/cli

Command-line tool for developing and building Cloudwerk applications.

## Installation

```bash
npm install @cloudwerk/cli
```

## Commands

### Development Server

Start the dev server with hot reload:

```bash
cloudwerk dev
```

Options:
- `-p, --port <number>` - Port to listen on (default: 3000)
- `-H, --host <host>` - Host to bind (default: localhost)
- `-c, --config <path>` - Path to config file
- `--verbose` - Enable verbose logging

### Production Build

Build for deployment to Cloudflare Workers:

```bash
cloudwerk build
```

Options:
- `-o, --output <dir>` - Output directory (default: ./dist)
- `--ssg` - Generate static pages for routes with `rendering: 'static'`
- `--minify` / `--no-minify` - Toggle minification (default: enabled)
- `--sourcemap` - Generate source maps
- `-c, --config <path>` - Path to config file
- `--verbose` - Enable verbose logging

### Configuration

Manage configuration values:

```bash
cloudwerk config get <key>
cloudwerk config set <key> <value>
```

## Quick Start

```bash
# Create a new project
mkdir my-app && cd my-app
npm init -y
npm install @cloudwerk/cli

# Create a simple page
mkdir -p app/routes
echo 'export default () => <h1>Hello Cloudwerk!</h1>' > app/routes/page.tsx

# Start development
npx cloudwerk dev
```

## Documentation

For full documentation, visit: https://github.com/squirrelsoft-dev/cloudwerk

## Part of Cloudwerk

This package is part of the [Cloudwerk](https://github.com/squirrelsoft-dev/cloudwerk) monorepo.
