# Implementation Plan: create-cloudwerk-app CLI Scaffolder

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Issue | #10 - feat(create-cloudwerk-app): implement project scaffolder |
| Reviewer | Backend Architect |
| Status | Ready for Approval |
| Labels | enhancement, spike, scaffolding |
| Milestone | v0.1.0 - First Spike: Hello Cloudwerk |

---

## Summary

Implement the `create-cloudwerk-app` CLI that scaffolds new Cloudwerk projects. The CLI will accept a project name, create a directory, copy a minimal template, and display post-creation instructions. This follows established patterns from `create-next-app` and `create-vite`.

---

## Scope

### In Scope
- CLI entry point with argument parsing (commander.js)
- Template directory with minimal starter files
- Project name validation (npm package name, no path traversal)
- Package manager detection (pnpm/npm/yarn)
- Post-creation instructions
- Error handling with cleanup on failure

### Out of Scope
- Interactive prompts mode (future enhancement)
- Multiple template variants (minimal, with-auth, full-stack)
- Git initialization
- Automatic dependency installation

---

## Technical Approach

### Architecture

```
apps/create-cloudwerk-app/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── scaffold.ts           # Core scaffolding logic
│   ├── validate.ts           # Input validation
│   └── utils.ts              # Package manager detection, logging
├── template/
│   ├── _gitignore            # Renamed to .gitignore on copy
│   ├── package.json.tmpl     # Template with {{name}} placeholder
│   ├── cloudwerk.config.ts
│   ├── tsconfig.json
│   ├── wrangler.toml.tmpl    # Template with {{name}} placeholder
│   └── app/
│       └── routes/
│           └── index.ts      # Returns "Hello Cloudwerk"
├── package.json
└── tsconfig.json
```

### Tech Stack
- **CLI Framework**: commander.js ^12.1.0 (matches @cloudwerk/cli)
- **File Operations**: fs-extra ^11.0.0
- **Terminal Colors**: picocolors ^1.1.0 (matches @cloudwerk/cli)
- **Build Tool**: tsup ^8.0.0 (matches other packages)
- **Testing**: vitest ^1.0.0 (matches other packages)

### Data Flow

```
User Input → Validate Name → Check Directory → Copy Template → Process Placeholders → Print Instructions
```

1. Parse CLI arguments with commander
2. Validate project name (npm package name format, no path traversal)
3. Check target directory doesn't exist
4. Copy template directory to target
5. Process `.tmpl` files, replacing `{{name}}` and version placeholders
6. Rename `_gitignore` to `.gitignore`
7. Detect package manager and print appropriate instructions

---

## File Changes

### New Files

| File | Purpose | Est. LOC |
|------|---------|----------|
| `apps/create-cloudwerk-app/src/index.ts` | CLI entry point, commander setup | ~40 |
| `apps/create-cloudwerk-app/src/scaffold.ts` | Core scaffolding logic | ~80 |
| `apps/create-cloudwerk-app/src/validate.ts` | Name validation utilities | ~30 |
| `apps/create-cloudwerk-app/src/utils.ts` | Package manager detection, logging | ~50 |
| `apps/create-cloudwerk-app/template/_gitignore` | Git ignore template | ~10 |
| `apps/create-cloudwerk-app/template/package.json.tmpl` | Project package.json template | ~25 |
| `apps/create-cloudwerk-app/template/cloudwerk.config.ts` | Cloudwerk configuration | ~8 |
| `apps/create-cloudwerk-app/template/tsconfig.json` | TypeScript configuration | ~15 |
| `apps/create-cloudwerk-app/template/wrangler.toml.tmpl` | Cloudflare Workers config | ~10 |
| `apps/create-cloudwerk-app/template/app/routes/index.ts` | Example route returning "Hello Cloudwerk" | ~10 |
| `apps/create-cloudwerk-app/tsconfig.json` | CLI TypeScript config | ~15 |
| `apps/create-cloudwerk-app/src/__tests__/scaffold.test.ts` | Unit tests | ~60 |

### Modified Files

| File | Changes | Est. LOC Changed |
|------|---------|------------------|
| `apps/create-cloudwerk-app/package.json` | Add bin, scripts, dependencies, build config | ~35 |

**Total Estimated LOC**: ~390

---

## Implementation Phases

### Phase 1: CLI Setup
**Files**: `src/index.ts`, `src/utils.ts`, `package.json`, `tsconfig.json`

Tasks:
1. Update `package.json` with bin field, dependencies, and build scripts
2. Create `tsconfig.json` for the CLI package
3. Implement CLI entry point with commander.js
4. Add package manager detection utility
5. Add colored logging utilities (info, success, error)

**Deliverable**: CLI that parses `npx create-cloudwerk-app <name>` and validates input

### Phase 2: Validation Logic
**Files**: `src/validate.ts`

Tasks:
1. Implement npm package name validation
2. Add path traversal prevention
3. Check target directory doesn't exist
4. Return structured validation errors

**Deliverable**: Robust input validation with clear error messages

### Phase 3: Template Files
**Files**: All files in `template/`

Tasks:
1. Create `_gitignore` (node_modules, dist, .wrangler, .dev.vars)
2. Create `package.json.tmpl` with placeholders
3. Create `cloudwerk.config.ts` using defineConfig
4. Create `tsconfig.json` matching monorepo patterns
5. Create `wrangler.toml.tmpl` with project name placeholder
6. Create `app/routes/index.ts` with GET handler returning "Hello Cloudwerk"

**Deliverable**: Complete minimal template ready for scaffolding

### Phase 4: Scaffolding Logic
**Files**: `src/scaffold.ts`

Tasks:
1. Copy template directory to target location
2. Process `.tmpl` files (replace placeholders, remove extension)
3. Rename `_gitignore` to `.gitignore`
4. Implement cleanup on failure
5. Print success message with next steps

**Deliverable**: Working scaffolder that creates functional projects

### Phase 5: Testing & Polish
**Files**: `src/__tests__/scaffold.test.ts`

Tasks:
1. Add unit tests for validation functions
2. Add integration test for full scaffolding flow (using temp directory)
3. Test error handling and cleanup
4. Verify generated project structure

**Deliverable**: Test coverage for core functionality

---

## Testing Strategy

### Test Distribution
- **Unit Tests (70%)**: Validation functions, utility functions
- **Integration Tests (20%)**: Full scaffolding flow in temp directory
- **E2E Tests (10%)**: `npx create-cloudwerk-app` → `pnpm dev` → verify output

### Coverage Target: 80%+

### Key Test Cases

| Test | Type | Description |
|------|------|-------------|
| Valid project name accepted | Unit | "my-app", "@scope/my-app" pass validation |
| Invalid names rejected | Unit | "..", "/etc/passwd", "MY_APP" fail validation |
| Directory conflict detected | Unit | Existing directory returns error |
| Template files copied | Integration | All template files exist in target |
| Placeholders replaced | Integration | {{name}} replaced in package.json, wrangler.toml |
| Cleanup on failure | Integration | Partial files removed if scaffolding fails |
| Generated project runs | E2E | `cloudwerk dev` starts successfully |

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Path traversal attack | Critical | Low | Strict validation: no `..`, `/`, must be valid npm name |
| Version mismatch with @cloudwerk/* | High | Medium | Read versions from workspace package.json at build time |
| Template files processed by bundler | Medium | Medium | Use `.tmpl` extension, exclude from tsup |
| Cross-platform path issues | Medium | Medium | Use `pathe` or `node:path` consistently |
| Template out of sync with framework | Medium | High | E2E test validates scaffolded project runs |

---

## Success Criteria

- [ ] `npx create-cloudwerk-app my-app` creates `my-app/` directory
- [ ] Generated project contains all template files
- [ ] `package.json` has correct project name and @cloudwerk/* versions
- [ ] `cloudwerk.config.ts` is valid configuration
- [ ] `app/routes/index.ts` exports GET handler returning JSON with "Hello Cloudwerk"
- [ ] Post-creation instructions display correct package manager commands
- [ ] Invalid project names show helpful error messages
- [ ] Existing directory conflict shows clear error
- [ ] Tests pass with 80%+ coverage

---

## Alternative Approaches Considered

### 1. Embedded Templates vs File System Templates

| Approach | Pros | Cons |
|----------|------|------|
| **File System (chosen)** | Easy to maintain, visible in repo, can be tested directly | Template files may be processed by bundler |
| **Embedded Strings** | No bundler interference, single file | Hard to maintain, poor DX |

**Decision**: Use file system with `.tmpl` extensions and explicit bundler exclusion.

### 2. Interactive Prompts

| Approach | Pros | Cons |
|----------|------|------|
| **Args Only (chosen)** | Simple, scriptable, faster | Less discoverable for new users |
| **Interactive Prompts** | Better UX, can guide users | Adds complexity, more dependencies |

**Decision**: Start with args-only for MVP. Interactive mode can be added later without breaking changes.

### 3. Version Handling

| Approach | Pros | Cons |
|----------|------|------|
| **Build-time Injection (chosen)** | Versions always match published packages | Requires build step coordination |
| **Runtime Detection** | No build step needed | Complex, may not work with npx |
| **Hardcoded "latest"** | Simplest | Users may get incompatible versions |

**Decision**: Inject versions at build time from workspace package.json files.

---

## Dependencies & Blockers

### Blocked By
- **#8 (@cloudwerk/core)**: Template needs working core package for defineConfig
- **#9 (@cloudwerk/cli)**: Template needs working CLI for dev server

### Blocks
- Nothing currently

---

## Next Steps

1. **Review this plan** - Provide feedback or request modifications
2. **Approve plan** - Confirm approach is acceptable
3. **Implement** - Run `/agency:implement .agency/plans/plan-create-cloudwerk-app-20260126.md`

### Commands
```bash
# To implement this plan:
/agency:implement .agency/plans/plan-create-cloudwerk-app-20260126.md

# To modify requirements:
# Edit this plan file and re-run /agency:plan 10

# To re-plan with different approach:
/agency:plan 10
```

---

## Appendix: Template File Contents

### template/package.json.tmpl
```json
{
  "name": "{{name}}",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "cloudwerk dev",
    "build": "cloudwerk build",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@cloudwerk/core": "^{{coreVersion}}",
    "@cloudwerk/cli": "^{{cliVersion}}",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "wrangler": "^3.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

### template/cloudwerk.config.ts
```typescript
import { defineConfig } from '@cloudwerk/core'

export default defineConfig({
  routesDir: 'app',
})
```

### template/app/routes/index.ts
```typescript
import { json } from '@cloudwerk/core'
import type { Context } from '@cloudwerk/core'

export const GET = (c: Context) => {
  return json({ message: 'Hello Cloudwerk' })
}
```

### template/wrangler.toml.tmpl
```toml
name = "{{name}}"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"
```

### template/_gitignore
```
node_modules/
dist/
.wrangler/
.dev.vars
*.log
```

### template/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./app"
  },
  "include": ["app/**/*", "cloudwerk.config.ts"]
}
```
