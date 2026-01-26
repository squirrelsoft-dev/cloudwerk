# Implementation Plan: End-to-End Spike Validation

| Field | Value |
|-------|-------|
| Date | 2026-01-26 |
| Issue | #11 - test: end-to-end spike validation |
| Reviewer | Backend Architect |
| Status | Ready for Approval |
| Labels | spike, testing |
| Milestone | v0.1.0 - First Spike: Hello Cloudwerk |

---

## Summary

Validate that the complete Cloudwerk spike flow works end-to-end: `npx create-cloudwerk-app test-app` → `pnpm install` → `pnpm dev` → browser shows `{ message: 'Hello Cloudwerk' }`. This is the final validation step before the v0.1.0 milestone is complete.

---

## Scope

### In Scope
- Automated E2E test validating full scaffold → dev → request flow
- Manual validation script for human verification
- Dynamic port allocation to avoid conflicts
- Documentation of validation process and troubleshooting
- Workspace linking strategy for unpublished packages

### Out of Scope
- Browser/Playwright testing (JSON API response, not HTML)
- Performance testing
- Windows compatibility (deferred)
- Hot reload testing

---

## Technical Approach

### Architecture

```
e2e/
├── vitest.config.ts              # E2E-specific Vitest config
├── spike-validation.test.ts      # Automated E2E test
└── utils/
    └── server-utils.ts           # Server spawn/wait/cleanup helpers
scripts/
└── validate-spike.sh             # Manual validation script
docs/
└── SPIKE-VALIDATION.md           # Documentation
```

### Package Linking Strategy

Since `@cloudwerk/core` and `@cloudwerk/cli` aren't published to npm yet, we need workspace linking:

**Primary Path (CI/Automated)**:
- Scaffold test app in temp directory
- Modify `package.json` to use `file:` protocol pointing to built packages
- Fast and reliable for automated testing

**Secondary Path (Manual/Pre-release)**:
- Use `pnpm pack` to create tarballs
- Reference tarballs in test app's `package.json`
- Simulates actual npm install flow

### Tech Stack
- **Test Framework**: vitest ^1.0.0 (matches existing packages)
- **HTTP Client**: Node.js native `fetch()` (Node 18+)
- **Process Management**: Node.js `child_process.spawn()` (not exec, for security)
- **Shell Script**: Bash (for manual validation)

### Data Flow

```
Test Setup:
1. Create temp directory
2. Run scaffold() programmatically
3. Modify package.json for workspace linking
4. Run pnpm install (spawn process)

Test Execution:
5. Start dev server (spawn pnpm dev --port <dynamic>)
6. Wait for server ready (health check loop)
7. Make HTTP request to /
8. Assert response = { message: 'Hello Cloudwerk' }

Test Teardown:
9. SIGTERM dev server process
10. Cleanup temp directory
```

---

## File Changes

### New Files

| File | Purpose | Est. LOC |
|------|---------|----------|
| `e2e/vitest.config.ts` | E2E-specific Vitest configuration | ~20 |
| `e2e/spike-validation.test.ts` | Main E2E test suite | ~150 |
| `e2e/utils/server-utils.ts` | Server spawn/wait/cleanup utilities | ~80 |
| `scripts/validate-spike.sh` | Manual validation bash script | ~100 |
| `docs/SPIKE-VALIDATION.md` | Documentation and troubleshooting | ~80 |

### Modified Files

| File | Changes | Est. LOC Changed |
|------|---------|------------------|
| `package.json` (root) | Add `test:e2e` and `validate:spike` scripts | ~5 |

**Total Estimated LOC**: ~435

---

## Implementation Phases

### Phase 1: Test Infrastructure Setup
**Files**: `e2e/vitest.config.ts`, `e2e/utils/server-utils.ts`

Tasks:
1. Create `e2e/` directory structure
2. Configure Vitest for E2E tests with longer timeouts
3. Implement `startServer()` utility using `spawn()` (not exec) with dynamic port
4. Implement `waitForServer()` with health check loop and backoff
5. Implement `stopServer()` with proper signal handling

**Deliverable**: Reusable test utilities for spawning/managing dev server

### Phase 2: Automated E2E Test
**Files**: `e2e/spike-validation.test.ts`

Tasks:
1. Implement `beforeAll`: create temp dir, scaffold project, modify package.json, install deps
2. Implement test: start server, verify startup
3. Implement test: request `/` returns `{ message: 'Hello Cloudwerk' }`
4. Implement test: request unknown route returns 404
5. Implement `afterAll`: kill server, cleanup temp dir

**Deliverable**: Automated test runnable via `pnpm test:e2e`

### Phase 3: Manual Validation Script
**Files**: `scripts/validate-spike.sh`

Tasks:
1. Create bash script with proper error handling (`set -e`)
2. Implement cleanup trap for graceful exit
3. Add step-by-step validation with colored output
4. Support dynamic port via `--port` flag
5. Print clear success/failure message

**Deliverable**: Script runnable via `pnpm validate:spike` or `./scripts/validate-spike.sh`

### Phase 4: Documentation
**Files**: `docs/SPIKE-VALIDATION.md`

Tasks:
1. Document how to run automated tests
2. Document how to run manual validation
3. Document expected output at each step
4. Add troubleshooting section for common issues
5. Document known gotchas (workspace linking, port conflicts)

**Deliverable**: Complete documentation for spike validation

### Phase 5: Integration
**Files**: `package.json` (root)

Tasks:
1. Add `"test:e2e": "vitest --config e2e/vitest.config.ts --run"` script
2. Add `"validate:spike": "./scripts/validate-spike.sh"` script
3. Verify scripts work from fresh clone

**Deliverable**: Integrated validation commands in monorepo

---

## Testing Strategy

### Test Distribution
- **Unit Tests (0%)**: N/A - this IS the integration test
- **Integration Tests (100%)**: Full E2E validation flow

### Test Cases

| Test | Type | Description |
|------|------|-------------|
| Project scaffolds correctly | E2E | All template files created, placeholders replaced |
| Dependencies install | E2E | `pnpm install` completes without errors |
| Dev server starts | E2E | Server binds to port, prints startup banner |
| GET / returns Hello Cloudwerk | E2E | HTTP 200, JSON response with correct message |
| GET /unknown returns 404 | E2E | Unknown routes handled gracefully |
| Server stops cleanly | E2E | SIGTERM stops server, no zombie processes |

### Timeout Configuration
- Test setup (scaffold + install): 60 seconds
- Server startup: 15 seconds
- Individual HTTP requests: 5 seconds
- Test teardown: 10 seconds

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Port 3000 in use | Test fails | Medium | Use dynamic port allocation (3000-3999 range) |
| pnpm install hangs | Test timeout | Low | Add 60s timeout, retry logic |
| Server doesn't start | Test fails | Low | Health check loop with detailed error logging |
| Zombie processes | Resource leak | Medium | Robust cleanup in afterAll, trap in bash script |
| Workspace linking issues | Install fails | Medium | Test with fresh node_modules, document pnpm version |
| Test flakiness in CI | Unreliable CI | Medium | Add retry logic, deterministic port allocation |

---

## Success Criteria

- [ ] `pnpm test:e2e` passes consistently (3 consecutive runs)
- [ ] `pnpm validate:spike` completes without errors
- [ ] HTTP request to `/` returns `{ "message": "Hello Cloudwerk" }`
- [ ] HTTP request to `/unknown` returns 404 status
- [ ] Server starts within 15 seconds
- [ ] Server stops cleanly on SIGTERM
- [ ] No zombie processes after test completion
- [ ] Documentation covers all troubleshooting scenarios

---

## Alternative Approaches Considered

### 1. Testing Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **Full E2E with process spawn (chosen)** | Most realistic, catches real issues | Slower, more complex setup |
| **Unit test with app.fetch()** | Fast, simple | Doesn't test CLI, process management |
| **Docker-based testing** | Isolated, reproducible | Adds complexity, slower CI |

**Decision**: Use full E2E for maximum confidence in spike flow.

### 2. Package Linking

| Approach | Pros | Cons |
|----------|------|------|
| **file: protocol (chosen)** | Simple, no extra build step | Requires path manipulation |
| **workspace: protocol** | Native pnpm support | Only works inside monorepo |
| **pnpm pack tarballs** | Most realistic | Slower, extra build step |

**Decision**: Use `file:` protocol for primary tests, document `pnpm pack` approach for pre-release validation.

### 3. Browser Testing

| Approach | Pros | Cons |
|----------|------|------|
| **curl/fetch only (chosen)** | Simple, fast, sufficient for JSON API | No visual verification |
| **Playwright/Puppeteer** | Full browser testing | Overkill for JSON response |

**Decision**: Skip browser testing - response is JSON, not rendered HTML.

---

## Dependencies & Blockers

### Blocked By
- **#8 (@cloudwerk/core)**: ✅ Complete
- **#9 (@cloudwerk/cli)**: ✅ Complete
- **#10 (create-cloudwerk-app)**: ✅ Complete

### Blocks
- **v0.1.0 Milestone**: This is the final validation before milestone completion

---

## Edge Cases to Test

1. **Port conflict**: Server should report clear error if port in use
2. **TypeScript errors**: Dev server should report compilation errors clearly
3. **Empty routes directory**: Should log warning but still start
4. **Invalid route handler**: Routes without exports should be skipped
5. **Graceful shutdown**: Ctrl+C should stop server without zombie processes

---

## Next Steps

1. **Review this plan** - Provide feedback or request modifications
2. **Approve plan** - Confirm approach is acceptable
3. **Implement** - Run `/agency:implement .agency/plans/plan-11-e2e-spike-validation-20260126.md`

### Commands
```bash
# To implement this plan:
/agency:implement .agency/plans/plan-11-e2e-spike-validation-20260126.md

# To modify requirements:
# Edit this plan file and re-run /agency:plan 11

# To re-plan with different approach:
/agency:plan 11
```

---

## Appendix: Key Code Patterns

### E2E Test Structure

```typescript
// e2e/spike-validation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scaffold } from '../apps/create-cloudwerk-app/src/scaffold.js'
import { startServer, stopServer, waitForServer, findAvailablePort } from './utils/server-utils.js'

describe('End-to-End Spike Validation', () => {
  let tempDir: string
  let serverProcess: ChildProcess | null = null
  let port: number

  beforeAll(async () => {
    // 1. Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'cloudwerk-e2e-'))
    const projectDir = join(tempDir, 'test-app')

    // 2. Scaffold project
    await scaffold('test-app', { targetDir: projectDir })

    // 3. Modify package.json for workspace linking
    await patchPackageJson(join(projectDir, 'package.json'))

    // 4. Install dependencies using spawn (not exec for security)
    await runCommand('pnpm', ['install'], { cwd: projectDir })

    // 5. Start dev server
    port = await findAvailablePort(3000, 3999)
    serverProcess = await startServer(projectDir, port)
    await waitForServer(`http://localhost:${port}`)
  }, 60000)

  afterAll(async () => {
    if (serverProcess) await stopServer(serverProcess)
    await rm(tempDir, { recursive: true, force: true })
  })

  it('responds with Hello Cloudwerk', async () => {
    const response = await fetch(`http://localhost:${port}/`)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toBe('Hello Cloudwerk')
  })

  it('returns 404 for unknown routes', async () => {
    const response = await fetch(`http://localhost:${port}/unknown`)
    expect(response.status).toBe(404)
  })
})

// Helper using spawn instead of exec for security
async function runCommand(cmd: string, args: string[], options: { cwd: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: options.cwd, stdio: 'inherit' })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with code ${code}`))
    })
  })
}
```

### Manual Validation Script

```bash
#!/bin/bash
# scripts/validate-spike.sh
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PORT=${PORT:-3456}
TEST_DIR=$(mktemp -d)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  echo -e "${YELLOW}Cleaning up...${NC}"
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "=== Cloudwerk Spike Validation ==="
echo "Working directory: $TEST_DIR"
echo "Port: $PORT"
echo ""

# Build packages
echo -e "${YELLOW}Step 1: Building packages...${NC}"
cd "$SCRIPT_DIR"
pnpm build

# Scaffold test app
echo -e "${YELLOW}Step 2: Scaffolding test app...${NC}"
node "$SCRIPT_DIR/apps/create-cloudwerk-app/dist/index.js" "$TEST_DIR/test-app"

# Patch package.json to use local packages
echo -e "${YELLOW}Step 3: Patching dependencies for local packages...${NC}"
cd "$TEST_DIR/test-app"
# Use node for cross-platform JSON manipulation
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.dependencies['@cloudwerk/core'] = 'file:$SCRIPT_DIR/packages/core';
pkg.dependencies['@cloudwerk/cli'] = 'file:$SCRIPT_DIR/packages/cli';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Install
echo -e "${YELLOW}Step 4: Installing dependencies...${NC}"
pnpm install

# Start server
echo -e "${YELLOW}Step 5: Starting dev server on port $PORT...${NC}"
pnpm dev --port "$PORT" &
SERVER_PID=$!

# Wait for ready
echo -e "${YELLOW}Step 6: Waiting for server...${NC}"
for i in {1..30}; do
  if curl -s "http://localhost:$PORT/" > /dev/null 2>&1; then
    echo "Server ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}FAILURE: Server did not start within 30 seconds${NC}"
    exit 1
  fi
  sleep 1
done

# Validate
echo -e "${YELLOW}Step 7: Validating response...${NC}"
RESPONSE=$(curl -s "http://localhost:$PORT/")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "Hello Cloudwerk"; then
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}SUCCESS: Spike validation passed!${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo ""
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}FAILURE: Unexpected response${NC}"
  echo -e "${RED}========================================${NC}"
  exit 1
fi
```
