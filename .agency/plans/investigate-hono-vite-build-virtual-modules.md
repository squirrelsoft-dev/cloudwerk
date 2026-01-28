# Investigation: @hono/vite-build with Virtual Modules

## Background

The CLI build command previously used `@hono/vite-build/cloudflare-workers` to bundle the server for Cloudflare Workers. This was replaced with direct Vite/Rollup configuration because virtual module resolution wasn't working correctly.

## The Problem

When using @hono/vite-build with a temp entry file that re-exported from a virtual module:

```typescript
// .cloudwerk-build/_server-entry.ts
export { default } from 'virtual:cloudwerk/server-entry'
```

The resulting bundle contained an unresolved import to the temp file's absolute path:

```javascript
import app from '/Users/.../apps/test-hydration/.cloudwerk-build/_server-entry.ts'
```

This caused a runtime error because:
1. The temp file was deleted after build
2. The virtual module wasn't resolved during bundling

## Investigation Goals

1. Understand how @hono/vite-build processes entry files
2. Determine why the Cloudwerk vite-plugin's `resolveId`/`load` hooks weren't invoked
3. Find a solution that allows using @hono/vite-build with virtual modules

## Investigation Steps

### Phase 1: Understand @hono/vite-build Internals

- [ ] Read the source code of `@hono/vite-build/cloudflare-workers`
  - Location: `node_modules/@hono/vite-build/`
  - Focus on how it processes the `entry` option
  - Check if it uses Vite's plugin system or has its own bundling

- [ ] Identify where the entry file import is generated
  - Is it during Vite's transform phase?
  - Is it a separate esbuild/rollup step?

- [ ] Check if @hono/vite-build respects Vite plugins
  - Does it pass plugins through to its internal bundler?
  - Are `resolveId` and `load` hooks honored?

### Phase 2: Debug the Current Behavior

- [ ] Add logging to Cloudwerk vite-plugin hooks
  ```typescript
  resolveId(id: string) {
    console.log('[cloudwerk] resolveId:', id)
    // ...
  }

  load(id: string) {
    console.log('[cloudwerk] load:', id)
    // ...
  }
  ```

- [ ] Run build with verbose logging to see:
  - Which hooks are called
  - What IDs are being resolved
  - Whether `virtual:cloudwerk/server-entry` is ever requested

- [ ] Compare hook invocations between:
  - Dev mode (where virtual modules work)
  - Production build with @hono/vite-build

### Phase 3: Potential Solutions

#### Option A: Configure @hono/vite-build to Use Vite Plugins

- [ ] Check if @hono/vite-build accepts a `plugins` option
- [ ] Try passing the Cloudwerk plugin explicitly:
  ```typescript
  cloudflareWorkersBuild({
    entry: tempEntryPath,
    plugins: [cloudwerk({ verbose })],
  })
  ```

#### Option B: Use Virtual Module ID Directly as Entry

- [ ] Test if @hono/vite-build accepts virtual module IDs:
  ```typescript
  cloudflareWorkersBuild({
    entry: 'virtual:cloudwerk/server-entry',
  })
  ```

- [ ] If not, investigate what format it expects

#### Option C: Generate Real File with Inlined Code

- [ ] Instead of re-exporting from virtual module, generate the full server entry code
- [ ] This is essentially what the current direct Rollup approach does
- [ ] Could still use @hono/vite-build if it provides other benefits

#### Option D: Custom Vite Plugin for @hono/vite-build Integration

- [ ] Create a plugin that runs before @hono/vite-build
- [ ] Intercept the entry file and resolve virtual modules
- [ ] Transform the temp file to include inlined code

### Phase 4: Evaluate Trade-offs

Compare the approaches:

| Approach | Pros | Cons |
|----------|------|------|
| Direct Vite/Rollup | Works now, full control | More config, may miss hono-build optimizations |
| @hono/vite-build + fix | Maintained by Hono team, optimized for Workers | Requires understanding internals |
| Hybrid | Best of both | Complexity |

## Files to Examine

- `packages/cli/src/commands/build.ts` - Current build implementation
- `packages/vite-plugin/src/plugin.ts` - Virtual module resolution
- `node_modules/@hono/vite-build/` - Hono build plugin source

## Success Criteria

- [ ] Understand root cause of virtual module resolution failure
- [ ] Document findings
- [ ] Either fix @hono/vite-build integration or document why direct Rollup is preferred

## Notes

The current direct Vite/Rollup approach works but:
- Bundle is larger (160KB vs 22KB with @hono/vite-build)
- Includes Node.js module imports requiring `nodejs_compat` flag
- May miss Cloudflare Workers-specific optimizations

Investigating this could lead to a cleaner, more optimized build.
