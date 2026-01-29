# @cloudwerk/create-app

Scaffold a new Cloudwerk project with a single command.

## Usage

```bash
npx @cloudwerk/create-app my-app
```

Or with a specific package manager:

```bash
pnpm create @cloudwerk/app my-app
npm create @cloudwerk/app my-app
yarn create @cloudwerk/app my-app
```

## Options

```
Usage: create-cloudwerk-app [options] <project-name>

Options:
  -r, --renderer <type>  UI renderer (hono-jsx, react, none)
  -V, --version          Output version number
  -h, --help             Display help
```

## Templates

| Renderer | Description |
|----------|-------------|
| `hono-jsx` | Full-stack app with Hono JSX (default) |
| `react` | Full-stack app with React SSR |
| `none` | API-only backend, no UI rendering |

## Examples

```bash
# Interactive mode (prompts for renderer)
npx @cloudwerk/create-app my-app

# Hono JSX template (default)
npx @cloudwerk/create-app my-app --renderer hono-jsx

# React template
npx @cloudwerk/create-app my-app --renderer react

# API-only template
npx @cloudwerk/create-app my-app --renderer none
```

## What's Included

Each template includes:
- Pre-configured `cloudwerk.config.ts`
- Example routes in `app/routes/`
- TypeScript configuration
- Development scripts (`dev`, `build`)

## Documentation

For full documentation, visit: https://github.com/squirrelsoft-dev/cloudwerk

## Part of Cloudwerk

This package is part of the [Cloudwerk](https://github.com/squirrelsoft-dev/cloudwerk) monorepo.
