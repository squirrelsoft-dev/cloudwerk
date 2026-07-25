# @cloudwerk/durable-object

## 0.2.0

### Minor Changes

- [#298](https://github.com/squirrelsoft-dev/cloudwerk/pull/298) [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Bump `vitest` from ^1.0.0 to ^4.0.0 and `@vitest/coverage-v8` from ^1.0.0 to ^4.0.0 across the root and every workspace package with a test script. This clears the critical advisory GHSA-5xrq-8626-4rwp (arbitrary file read/execute via the Vitest UI server, fixed in ≥3.2.6) and collapses the duplicate `vite@5.4.21` that vitest 1's vite-node pulled in — the lockfile now resolves a single `vite@6.4.3`. Vitest 4 requires Vite ≥6 and Node ≥20, both already satisfied. No `vitest.config.*`/`vite.config.*` migration was needed: no config used the removed `coverage.all`/`coverage.extensions` options (all already use `coverage.include`), no constructor `vi.spyOn` usage, no snapshots to re-baseline. All 1605 tests pass on vitest 4.1.10.

- [#300](https://github.com/squirrelsoft-dev/cloudwerk/pull/300) [`edc45f3`](https://github.com/squirrelsoft-dev/cloudwerk/commit/edc45f34587debae205815c6ca94f98cb217d817) Thanks [@sbeardsley](https://github.com/sbeardsley)! - Group K — Node 22.12 engine floor (linchpin). Bump `engines.node` from `>=20` to `>=22.12` (Node 20 is EOL) across root, `@cloudwerk/create-app`, and all examples. Bump `wrangler` ^4.0.0 → ^4.114.0 in `@cloudwerk/cli` and examples (pulls undici 7.18.2 → 7.28.0, clearing 11 undici advisories; peers `@cloudflare/workers-types ^5`). Bump `@cloudflare/workers-types` ^4 → ^5 in `@cloudwerk/durable-object`. Bump `commander` ^12.1.0 → ^15.0.0 in `@cloudwerk/cli` and `@cloudwerk/create-app` (v15 requires Node ≥22.12, now unblocked). Bump root `@types/node` ^20 → ^22 to align to the new engine floor. Bump root `packageManager` pnpm@9.0.0 → pnpm@10.15.1 (pnpm 11 deferred — see PR body). This unblocks Groups J (docs stack: astro 7 / starlight / sharp / satori / linkinator), L (typescript 7), and M (vite 8).

### Patch Changes

- Updated dependencies [[`fea241d`](https://github.com/squirrelsoft-dev/cloudwerk/commit/fea241db0bf53c6c1c586abf66d7064cd7b9d685), [`be8b381`](https://github.com/squirrelsoft-dev/cloudwerk/commit/be8b381726429cb8a1a847364a67abf2adcfc690), [`53f62e4`](https://github.com/squirrelsoft-dev/cloudwerk/commit/53f62e4cc626f5f57477a921e18eeedcaccc3f55), [`bf8ddb2`](https://github.com/squirrelsoft-dev/cloudwerk/commit/bf8ddb2a74f26fd83e269eaa04d318aa68d055de)]:
  - @cloudwerk/core@0.17.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`00cc9c5`](https://github.com/squirrelsoft-dev/cloudwerk/commit/00cc9c509f0f19ab42a1cb7f8fcaec33fd4ff354)]:
  - @cloudwerk/core@0.15.3

## 0.1.3

### Patch Changes

- Updated dependencies [[`30285a8`](https://github.com/squirrelsoft-dev/cloudwerk/commit/30285a8468f670bb0c57386c3a470f19bba2ee49)]:
  - @cloudwerk/core@0.15.1

## 0.1.2

### Patch Changes

- Updated dependencies [[`3a54d33`](https://github.com/squirrelsoft-dev/cloudwerk/commit/3a54d330f2eb5e1bbb5c1aef62917e061df61ef6)]:
  - @cloudwerk/core@0.15.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`5f38299`](https://github.com/squirrelsoft-dev/cloudwerk/commit/5f3829954b73d119ef57bceddc6c806a5fbaca3c)]:
  - @cloudwerk/core@0.14.0

## 0.1.0

### Minor Changes

- [#217](https://github.com/squirrelsoft-dev/cloudwerk/pull/217) [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0) Thanks [@sbeardsley](https://github.com/sbeardsley)! - feat(durable-object): implement Durable Objects support for Cloudwerk

  This release adds convention-based Durable Object support, enabling type-safe, stateful edge computing with native Cloudflare RPC.

  ## New Package: @cloudwerk/durable-object

  ### Features
  - **defineDurableObject()**: Factory function for creating durable object definitions
    - Type-safe state management with generics
    - Native Cloudflare RPC support via `methods` config
    - Built-in handlers for `fetch`, `alarm`, and WebSocket events
    - SQLite storage support with `sqlite: true` flag
    - Zod schema validation for state
  - **Error Classes**: Comprehensive error handling
    - `DurableObjectError` base class
    - `DurableObjectConfigError`, `DurableObjectNotFoundError`
    - `DurableObjectStateError`, `DurableObjectRPCError`
    - WebSocket and alarm-specific errors

  ### Usage Example

  ```typescript
  // app/objects/counter.ts
  import { defineDurableObject } from "@cloudwerk/durable-object";

  interface CounterState {
    value: number;
  }

  export default defineDurableObject<CounterState>({
    sqlite: true,

    async init(ctx) {
      ctx.sql.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY)`);
      return { value: 0 };
    },

    methods: {
      async increment(amount = 1) {
        this.state.value += amount;
        return this.state.value;
      },

      async getValue() {
        return this.state.value;
      },
    },
  });
  ```

  ```typescript
  // In route handlers
  import { durableObjects } from "@cloudwerk/bindings";

  export async function POST(request: Request, { params }: Context) {
    const id = durableObjects.Counter.idFromName(params.id);
    const counter = durableObjects.Counter.get(id);

    // Native RPC - direct method calls!
    const value = await counter.increment(5);

    return Response.json({ value });
  }
  ```

  ## Core Package Updates

  ### Scanner (`durable-object-scanner.ts`)
  - Scans `app/objects/` for durable object definitions
  - Name conversion utilities: `fileNameToObjectName`, `objectNameToBindingName`, `objectNameToClassName`
  - Both async and sync scanning functions

  ### Compiler (`durable-object-compiler.ts`)
  - Compiles scanned files into `DurableObjectManifest`
  - Validation for duplicate names, invalid formats
  - Entry updates from loaded definitions

  ### Bindings (`bindings.ts`)
  - `durableObjects` proxy for typed namespace access
  - `getDurableObject()`, `hasDurableObject()`, `getDurableObjectNames()` helpers
  - Full TypeScript support for RPC methods

  ## CLI Utilities (for future CLI commands)
  - `durable-object-class-generator.ts`: Generates DurableObject classes from definitions
  - `durable-object-wrangler.ts`: Generates wrangler.toml bindings and migrations
  - `durable-object-migrations.ts`: Tracks class additions/removals/renames
  - `durable-object-type-generator.ts`: Generates `.cloudwerk/types/durable-objects.d.ts`

### Patch Changes

- Updated dependencies [[`96b77e6`](https://github.com/squirrelsoft-dev/cloudwerk/commit/96b77e6056f5b6c522dfaf07264aafa48f26249f), [`068b10f`](https://github.com/squirrelsoft-dev/cloudwerk/commit/068b10ffbe84dbbe38307c3ebdfe415f53a1904b), [`c179642`](https://github.com/squirrelsoft-dev/cloudwerk/commit/c179642bd67ced2d170bcdb4a723767aacd81eb0), [`39d7a47`](https://github.com/squirrelsoft-dev/cloudwerk/commit/39d7a4783a5aca94073cdd6b142cc74789856e61)]:
  - @cloudwerk/core@0.13.0
