---
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
"@cloudwerk/vite-plugin": minor
---

Bump `vite` from `^6.4.3` to `^7.0.0` — stage 1 of the 6→8 migration (Group M1 from the
dependency audit). Vite 7 is the Rolldown/Oxc preview stage: dep optimization, JS
transforms, and minification move toward Rolldown internals while the `vite` package
itself still ships the stable esbuild/Rollup pipeline (Rolldown is opt-in via the
separate `rolldown-vite` package, not required here). Security is already handled
in-range (6.4.3, Group A); this bump is currency only.

- `@cloudwerk/cli`: `dependencies.vite` narrowed from `^5.0.0 || ^6.0.0 || ^7.0.0` to
  `^7.0.0` so the bundled dev server actually resolves and runs on vite 7 (the old range
  let pnpm keep 6.4.3 since it still satisfied the range).
- `@cloudwerk/vite-plugin`: `devDependencies.vite` bumped to `^7.0.0`; its
  `peerDependencies.vite` range (`^5.0.0 || ^6.0.0 || ^7.0.0`) already covered 7 and is
  unchanged, so downstream consumers can stay on vite 5/6 or move to 7.
- `@cloudwerk/core`: `devDependencies.vite` bumped to `^7.0.0`; `peerDependencies.vite`
  widened from `^5.0.0 || ^6.0.0` to include `^7.0.0`.
- All `examples/*` that depend on vite bumped to `^7.0.0`.
- `pnpm.overrides.esbuild` (`^0.28.0`) is unchanged — esbuild is still used by vite 7
  and only becomes optional in vite 8 (Group M2).

No `optimizeDeps.esbuildOptions`/`esbuild.*` config migration was needed: a repo-wide
search found no `esbuildOptions`/`optimizeDeps` usage, and the one place a top-level
`esbuild` key is set (`@cloudwerk/vite-plugin`'s JSX transform config) is the
non-deprecated `esbuild.jsx*` transform option, not the deprecated
`optimizeDeps.esbuildOptions`. No `vite.config.*` files exist in this repo — cli/
vite-plugin construct Vite's `InlineConfig` programmatically and already pin explicit
`build.target`/`ssr.target` values (`esnext`/`webworker`) and `minify: 'esbuild'`, so
Vite 7's new default `build.target` (bumped from the old `modules` baseline) doesn't
affect the Workers server bundle. The client bundle build target is left at Vite's
default (as before); an `examples/blog` build (client + server) completes successfully
under vite 7.3.6.

Verified: `pnpm install`, `pnpm build` (14/14), `pnpm test` (27/27 tasks, 0 failures —
vite-plugin 123/123, cli 48/48), `pnpm lint` (0 errors, pre-existing unrelated
`no-explicit-any` warnings only). `pnpm audit` shows no new advisories tied to vite or
Rolldown; the 6.4.3 security fix from Group A holds.
