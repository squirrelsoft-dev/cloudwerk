---
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
"@cloudwerk/ui": minor
---

feat(ui): Add core renderer abstraction layer

- New `@cloudwerk/ui` package with facade pattern for swappable UI renderers
- Export `render()`, `html()`, `hydrate()` functions from `@cloudwerk/ui`
- Add `UIConfig` type with `renderer` option to `@cloudwerk/core`
- Initialize renderer from config at CLI app startup
- Default renderer is Hono JSX, with support for custom renderer registration
