import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    session: 'src/session/index.ts',
    middleware: 'src/middleware/index.ts',
    password: 'src/password/index.ts',
    providers: 'src/providers/index.ts',
    oauth: 'src/providers/oauth/index.ts',
    convention: 'src/convention/index.ts',
    routes: 'src/routes/index.ts',
    rbac: 'src/rbac/index.ts',
    'rate-limit': 'src/rate-limit/index.ts',
    tenant: 'src/tenant/index.ts',
    client: 'src/client/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
})
