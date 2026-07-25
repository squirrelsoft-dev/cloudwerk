---
"@cloudwerk/cli": minor
"@cloudwerk/create-app": minor
"@cloudwerk/durable-object": minor
---

Group K — Node 22.12 engine floor (linchpin). Bump `engines.node` from `>=20` to `>=22.12` (Node 20 is EOL) across root, `@cloudwerk/create-app`, and all examples. Bump `wrangler` ^4.0.0 → ^4.114.0 in `@cloudwerk/cli` and examples (pulls undici 7.18.2 → 7.28.0, clearing 11 undici advisories; peers `@cloudflare/workers-types ^5`). Bump `@cloudflare/workers-types` ^4 → ^5 in `@cloudwerk/durable-object`. Bump `commander` ^12.1.0 → ^15.0.0 in `@cloudwerk/cli` and `@cloudwerk/create-app` (v15 requires Node ≥22.12, now unblocked). Bump root `@types/node` ^20 → ^22 to align to the new engine floor. Bump root `packageManager` pnpm@9.0.0 → pnpm@10.15.1 (pnpm 11 deferred — see PR body). This unblocks Groups J (docs stack: astro 7 / starlight / sharp / satori / linkinator), L (typescript 7), and M (vite 8).