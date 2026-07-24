---
"@cloudwerk/auth": patch
"@cloudwerk/cli": patch
"@cloudwerk/vite-plugin": patch
"@cloudwerk/create-app": patch
---

Leaf dependency batch (Groups C/D/G/H/I from the dependency audit):

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