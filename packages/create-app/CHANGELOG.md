# @cloudwerk/create-app

## 0.2.0

### Minor Changes

- [#221](https://github.com/squirrelsoft-dev/cloudwerk/pull/221) [`0bc28fe`](https://github.com/squirrelsoft-dev/cloudwerk/commit/0bc28fe7edf0394d611f7c653184bd4f4c5acaf1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Polished starter templates with Next.js-style developer experience
  - Added Tailwind CSS v4 with Vite plugin to hono-jsx and react templates
  - Added root layout with HTML structure, dark mode support, and globals.css
  - Redesigned landing page with gradient branding, counter demo, and quick links
  - Added TypeScript path mappings for @cloudwerk/core/bindings and @cloudwerk/core/context
  - Added global.d.ts for Vite client types and CSS module declarations
  - Added account_id placeholder to wrangler.toml
  - Added .cloudwerk/ to gitignore
  - Updated route handlers to use Cloudwerk-native style instead of Hono-style

## 0.1.2

### Patch Changes

- [#147](https://github.com/squirrelsoft-dev/cloudwerk/pull/147) [`257662b`](https://github.com/squirrelsoft-dev/cloudwerk/commit/257662b07d2c1f58acef9376d8dd17a58788be0d) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add README file for npm display

## 0.1.1

### Patch Changes

- [#143](https://github.com/squirrelsoft-dev/cloudwerk/pull/143) [`9b9d131`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b9d131c7b4f6acbfef1b462a5e2b5c689f626a4) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix routes directory structure to use `app/` instead of `app/routes/`
  - Fixed `resolveRoutesPath()` in core to handle when `routesDir === appDir`, preventing incorrect resolution to `app/app/`
  - Updated all create-app templates to place routes directly in `app/` directory (matching Next.js convention)
  - Removed `routesDir: 'app/routes'` override from template configs
  - Updated installation docs to reflect actual CLI prompts

## 0.1.0

### Minor Changes

- [#131](https://github.com/squirrelsoft-dev/cloudwerk/pull/131) [`6d21aaf`](https://github.com/squirrelsoft-dev/cloudwerk/commit/6d21aaf3e7356b49357d092191ff7a4d4bfdbb33) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Launch documentation site with Starlight
  - Add comprehensive Getting Started guide with installation, quick start, and project structure docs
  - Add detailed guides for data loading, database (D1), authentication, routing, and forms
  - Add blog example demonstrating full-stack patterns with D1 and sessions
  - Fix installation commands in documentation

## 0.0.6

### Patch Changes

- [`c3225ff`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c3225fff1bdadfdbaa6dac5fac27e2a82a6f0caf) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Update wrangler to v4 in template to fix security vulnerabilities (esbuild, undici)

## 0.0.5

### Patch Changes

- [`d2f7e98`](https://github.com/squirrelsoft-dev/cloudwerk/commit/d2f7e98cb2ed3ebd1b49a50df2c0127698a2a6c7) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Auto-generate package versions from workspace at build time instead of hardcoding

## 0.0.4

### Patch Changes

- [`92ca5fd`](https://github.com/squirrelsoft-dev/cloudwerk/commit/92ca5fd19d1c02be8d2ff7986970d397ce5fa8ce) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix CI/CD publishing with npm trusted publishing (OIDC)

## 0.0.3

### Patch Changes

- [`b32ba88`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b32ba88801cee8a5c0e64c478b22ff578b9addd1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add repository field to package.json for npm trusted publishing

## 0.0.2

### Patch Changes

- [`affccc6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/affccc646a13e24217180a4291491762fade8013) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Update scaffolded projects to use @cloudwerk/cli 0.0.2
