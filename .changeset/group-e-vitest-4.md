---
"@cloudwerk/auth": minor
"@cloudwerk/cli": minor
"@cloudwerk/core": minor
"@cloudwerk/create-app": minor
"@cloudwerk/durable-object": minor
"@cloudwerk/images": minor
"@cloudwerk/queue": minor
"@cloudwerk/security": minor
"@cloudwerk/service": minor
"@cloudwerk/trigger": minor
"@cloudwerk/ui": minor
"@cloudwerk/utils": minor
"@cloudwerk/vite-plugin": minor
---

Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.