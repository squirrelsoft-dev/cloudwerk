# @cloudwerk/create-app

## 0.17.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

- [#300](https://github.com/squirrelsoft-dev/cloudwerk/pull/300) [`edc45f3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/edc45f34587debae205815c6ca94f98cb217d817) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Group K — Node 22.12 engine floor (linchpin). Bump `engines.node` from `>=20` to `>=22.12` (Node 20 is EOL) across root, `@cloudwerk/create-app`, and all examples. Bump `wrangler` ^4.0.0 → ^4.114.0 in `@cloudwerk/cli` and examples (pulls undici 7.18.2 → 7.28.0, clearing 11 undici advisories; peers `@cloudflare/workers-types ^5`). Bump `@cloudflare/workers-types` ^4 → ^5 in `@cloudwerk/durable-object`. Bump `commander` ^12.1.0 → ^15.0.0 in `@cloudwerk/cli` and `@cloudwerk/create-app` (v15 requires Node ≥22.12, now unblocked). Bump root `@types/node` ^20 → ^22 to align to the new engine floor. Bump root `packageManager` pnpm@9.0.0 → pnpm@10.15.1 (pnpm 11 deferred — see PR body). This unblocks Groups J (docs stack: astro 7 / starlight / sharp / satori / linkinator), L (typescript 7), and M (vite 8).

### Patch Changes

- [#294](https://github.com/squirrelsoft-dev/cloudwerk/pull/294) [`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Security/patch in-range dependency batch (Group A from the dependency audit).

  Bumps resolved versions within existing ranges — no major bumps, no engine-floor
  change, no `packageManager` change, no `wrangler` bump, no `esbuild` override change:

  - hono ^4.0.0 → 4.12.32 (clears 31 security advisories)
  - vite → 6.4.3 (clears the direct vite advisories; transitive vite via
    astro/vitest is out of scope for this batch)
  - turbo ^2.0.0 → 2.10.6 (clears 2 advisories, ≥2.9.14)
  - @hono/vite-build → 1.11.1, @inquirer/prompts → 8.5.2, fs-extra → 11.4.0,
    motion → 12.42.2, prettier → 3.9.6, @changesets/cli → 2.31.1,
    @swc/core → 1.15.46, react/react-dom → 19.2.8, @types/react → 19.2.17,
    @tailwindcss/vite → 4.3.3, tailwindcss → 4.3.3

  The `@cloudwerk/cli` `vite` range is unchanged (`^5.0.0 || ^6.0.0 || ^7.0.0`);
  its resolved version is pinned to 6.4.3 to avoid an unintended 6→7 major jump.

- [#297](https://github.com/squirrelsoft-dev/cloudwerk/pull/297) [`ef6af28`](https://github.com/squirrelsoft-dev/cloudwerk/commit/ef6af28c13821bda64908279a4bcd10733a3fee6) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Leaf dependency batch (Groups C/D/G/H/I from the dependency audit):

  - **Group C:** `jose` 5 → 6 (`@cloudwerk/auth`). cloudwerk only uses `SignJWT`,
    `jwtVerify`, and `jose.errors.*` (cookie-store.ts) — none removed in v6.
  - **Group D:** `@hono/node-server` 1 → 2, `@hono/vite-dev-server` 0.18 → 0.26,
    `@hono/vite-build` 1.11 (already in range) in `@cloudwerk/cli`; `@hono/vite-dev-server`
    0.18 → 0.26 (dev + peer) in `@cloudwerk/vite-plugin`. Both 0.26 and 2.0 are ESM-only
    (cli/vite-plugin are ESM); `@hono/node-server` v2 keeps the public API.
  - **Group G:** `@clack/prompts` 0.8 → 1 (`@cloudwerk/create-app`, ESM-only).
    `commander` unchanged (its 15 bump is deferred to the Node 22 floor).
  - **Group H:** `vite-tsconfig-paths` 5 → 6 (`examples/feature-flags`, private — no
    published change, included for completeness).
  - **Group I:** `@changesets/changelog-github` 0.5 → 0.7 (root devDep, additive
    `disableThanks` option).

  Verified: `pnpm install`, `pnpm build` (14/14), `pnpm test` (27/27 tasks, 0 failures —
  auth 331, cli 48, vite-plugin 123, create-app 55), `pnpm lint` (0 errors). The
  `examples/feature-flags` build completes successfully; a pre-existing static-generation
  warning about the `@/services/flags/service` alias is reproducible on `main` with the
  prior `vite-tsconfig-paths` 5.x and is unrelated to this bump.

## 0.16.2

### Patch Changes

- [#291](https://github.com/squirrelsoft-dev/cloudwerk/pull/291) [`d404535`](https://github.com/squirrelsoft-dev/cloudwerk/commit/d404535098ee9b1d1c240f77fa4e77c30dfc1923) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add Turborepo for cached build orchestration. Add Bun engine support to scaffolded project templates. Show runtime info in dev server startup banner.

## 0.15.4

### Patch Changes

- [#251](https://github.com/squirrelsoft-dev/cloudwerk/pull/251) [`efb4e0f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/efb4e0faad728b494c06079da91f4e4ddb1f6a77) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Update template dependency versions to match latest published packages.

## 0.2.3

### Patch Changes

- [#240](https://github.com/squirrelsoft-dev/cloudwerk/pull/240) [`23beeb7`](https://github.com/squirrelsoft-dev/cloudwerk/commit/23beeb713927a4ee591b892df5877ea657ec460e) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add minimatch override to project templates to resolve npm audit vulnerability (GHSA-3ppc-4f35-3m26)

## 0.2.2

### Patch Changes

- [#233](https://github.com/squirrelsoft-dev/cloudwerk/pull/233) [`dbdf87a`](https://github.com/squirrelsoft-dev/cloudwerk/commit/dbdf87af77cbedd9178defc96b733fa62c0fc74c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - fix(create-app): add tsconfig paths support to hono-jsx template
  - Added `vite-tsconfig-paths` plugin for path alias resolution
  - Moved components from `app/components/` to root `components/` directory
  - Added `@/*` path alias pointing to project root
  - Updated imports to use `@/components/counter` style

## 0.2.1

### Patch Changes

- [#230](https://github.com/squirrelsoft-dev/cloudwerk/pull/230) [`1d67142`](https://github.com/squirrelsoft-dev/cloudwerk/commit/1d671423126b17f735679a45517cce437d30269a) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fixed CSS imports on hono-jsx template

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
