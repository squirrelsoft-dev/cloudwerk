import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    runtime: 'src/runtime.ts',
    build: 'src/build.ts',
    bindings: 'src/bindings.ts',
    'context-exports': 'src/context-exports.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  // splitting: false ensures each entry point is self-contained.
  // Types are re-exported (not duplicated) so there's minimal size impact:
  // runtime (10.8KB) + build (35.7KB) ≈ index (46.4KB)
  splitting: false,
  sourcemap: true,
})
