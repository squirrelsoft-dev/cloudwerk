# @cloudwerk/cli

## 0.1.0

### Minor Changes

- [#109](https://github.com/squirrelsoft-dev/cloudwerk/pull/109) [`2ca18e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/2ca18e62c84e50dbf0e92394c6c50963befdf70c) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(ui): Add core renderer abstraction layer
  - New `@cloudwerk/ui` package with facade pattern for swappable UI renderers
  - Export `render()`, `html()`, `hydrate()` functions from `@cloudwerk/ui`
  - Add `UIConfig` type with `renderer` option to `@cloudwerk/core`
  - Initialize renderer from config at CLI app startup
  - Default renderer is Hono JSX, with support for custom renderer registration

### Patch Changes

- Updated dependencies [[`2ca18e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/2ca18e62c84e50dbf0e92394c6c50963befdf70c)]:
  - @cloudwerk/core@0.1.0
  - @cloudwerk/ui@0.1.0

## 0.0.6

### Patch Changes

- [`9b1016d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b1016d3742b5b279437637a85bd3bf771ba7505) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Upgrade esbuild to 0.25.0 to address security vulnerability (GHSA-67mh-4wv8-2f99)

- Updated dependencies [[`9b1016d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/9b1016d3742b5b279437637a85bd3bf771ba7505)]:
  - @cloudwerk/core@0.0.6

## 0.0.5

### Patch Changes

- [`92ca5fd`](https://github.com/squirrelsoft-dev/cloudwerk/commit/92ca5fd19d1c02be8d2ff7986970d397ce5fa8ce) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix CI/CD publishing with npm trusted publishing (OIDC)

- Updated dependencies [[`92ca5fd`](https://github.com/squirrelsoft-dev/cloudwerk/commit/92ca5fd19d1c02be8d2ff7986970d397ce5fa8ce)]:
  - @cloudwerk/core@0.0.5

## 0.0.4

### Patch Changes

- [`b32ba88`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b32ba88801cee8a5c0e64c478b22ff578b9addd1) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Add repository field to package.json for npm trusted publishing

- Updated dependencies [[`b32ba88`](https://github.com/squirrelsoft-dev/cloudwerk/commit/b32ba88801cee8a5c0e64c478b22ff578b9addd1)]:
  - @cloudwerk/core@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies [[`23b3847`](https://github.com/squirrelsoft-dev/cloudwerk/commit/23b384733387e03b7b86fa6e743a843c4d316246)]:
  - @cloudwerk/core@0.0.3

## 0.0.2

### Patch Changes

- [`5143630`](https://github.com/squirrelsoft-dev/cloudwerk/commit/51436307b1044795595490a525459a4d96934943) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Fix workspace protocol resolution - use workspace:^ instead of workspace:\* so pnpm converts it to proper semver on publish
