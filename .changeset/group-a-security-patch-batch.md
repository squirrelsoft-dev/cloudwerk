---
"@cloudwerk/core": patch
"@cloudwerk/cli": patch
"@cloudwerk/ui": patch
"@cloudwerk/vite-plugin": patch
"@cloudwerk/create-app": patch
---

Security/patch in-range dependency batch (Group A from the dependency audit).

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