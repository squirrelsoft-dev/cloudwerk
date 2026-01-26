# Spike Validation Guide

This document describes how to validate the Cloudwerk v0.1.0 spike - the complete flow from scaffolding a new project to receiving the "Hello Cloudwerk" response.

## Overview

The spike validation tests the complete Cloudwerk flow:

1. **Scaffold**: Create a new Cloudwerk project
2. **Install**: Install dependencies (with local package linking)
3. **Dev Server**: Start the development server
4. **Request**: Make HTTP request to `/`
5. **Response**: Verify `{ "message": "Hello Cloudwerk" }`

## Prerequisites

Before running validation, ensure:

- Node.js >= 20 installed
- pnpm >= 9.0.0 installed
- All packages are built: `pnpm build`

## Running Automated Tests

### E2E Test Suite

The automated E2E tests use Vitest and test the complete flow programmatically.

```bash
# Run E2E tests
pnpm test:e2e

# Run with debug output
E2E_DEBUG=1 pnpm test:e2e
```

### What the E2E Tests Validate

| Test | Description |
|------|-------------|
| GET / returns Hello Cloudwerk | HTTP 200 with correct JSON response |
| GET /unknown returns 404 | Unknown routes return 404 status |
| Multiple requests work | Server handles sequential requests |

### Expected Output

```
 RUN  e2e/spike-validation.test.ts
[E2E] Temp directory: /tmp/cloudwerk-e2e-xxxxx
[E2E] Project directory: /tmp/cloudwerk-e2e-xxxxx/test-app
[E2E] Scaffolding project...
[E2E] Patching package.json for workspace linking...
[E2E] Installing dependencies...
[E2E] Starting dev server on port 3xxx...
[E2E] Waiting for server to be ready...
[E2E] Server is ready!

 PASS  End-to-End Spike Validation > GET / returns { message: "Hello Cloudwerk" }
 PASS  End-to-End Spike Validation > GET /unknown returns 404
 PASS  End-to-End Spike Validation > server responds to multiple requests

[E2E] Stopping server...
[E2E] Cleaning up temp directory...

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Running Manual Validation

### Validation Script

For manual verification with step-by-step output:

```bash
# Run validation script
pnpm validate:spike

# Use custom port
PORT=4000 pnpm validate:spike
```

### What the Script Does

1. Builds all packages (`pnpm build`)
2. Scaffolds a test project in a temp directory
3. Patches `package.json` to use local packages via `file:` protocol
4. Installs dependencies (`pnpm install`)
5. Starts the dev server on the specified port
6. Waits for the server to be ready
7. Makes HTTP requests and validates responses
8. Cleans up automatically on exit

### Expected Output

```
============================================
Cloudwerk Spike Validation
============================================
Monorepo root: /path/to/cloudwerk
Test directory: /tmp/tmp.xxxxx
Port: 3456

[Step 1] Building packages...
  Packages built successfully

[Step 2] Scaffolding test project...
  Project scaffolded at: /tmp/tmp.xxxxx/cloudwerk-spike-test

[Step 3] Patching package.json for local packages...
  Updated @cloudwerk/core: file:/path/to/cloudwerk/packages/core
  Updated @cloudwerk/cli: file:/path/to/cloudwerk/packages/cli
  package.json patched

[Step 4] Installing dependencies...
  Dependencies installed

[Step 5] Starting dev server on port 3456...
  Server PID: 12345
  Waiting for server to be ready...
  Server is ready!

[Step 6] Validating HTTP response...
  GET http://localhost:3456/
  Response: {"message":"Hello Cloudwerk"}
  Response is correct!

  GET http://localhost:3456/unknown
  Status: 404
  404 response is correct!

============================================
SUCCESS: Spike validation passed!
============================================
```

## Troubleshooting

### Port Already in Use

**Symptom**: Server fails to start, error about port being in use.

**Solution**: Use a different port:
```bash
PORT=4000 pnpm validate:spike
```

### pnpm Install Hangs

**Symptom**: `pnpm install` takes forever or hangs.

**Possible Causes**:
- Network issues
- Lockfile conflicts

**Solution**:
```bash
# Clear pnpm cache
pnpm store prune

# Retry with verbose output
pnpm install --verbose
```

### Server Doesn't Start

**Symptom**: "Server did not respond within timeout"

**Possible Causes**:
- Build failed
- TypeScript errors in routes
- Port conflict

**Debug Steps**:
1. Check packages are built: `ls packages/*/dist/`
2. Run dev server manually: `cd test-app && pnpm dev`
3. Check for TypeScript errors in console

### Wrong Response

**Symptom**: Server responds but with unexpected content.

**Possible Causes**:
- Template not copied correctly
- Route handler not exported correctly

**Debug Steps**:
1. Check route file exists: `cat test-app/app/routes/route.ts`
2. Verify it exports `GET` handler

### Zombie Processes

**Symptom**: Server process left running after tests.

**Solution**:
```bash
# Find and kill orphaned node processes
pkill -f "cloudwerk dev"

# Or find by port
lsof -i :3456 | grep node | awk '{print $2}' | xargs kill
```

## Package Linking Explained

Since `@cloudwerk/core` and `@cloudwerk/cli` are not published to npm, we use the `file:` protocol to link local packages:

```json
{
  "dependencies": {
    "@cloudwerk/core": "file:../../packages/core",
    "@cloudwerk/cli": "file:../../packages/cli"
  }
}
```

This approach:
- Works with pnpm
- Doesn't require npm publish
- Uses the built `dist/` directories
- Is fast and reliable for testing

## CI/CD Integration

For CI pipelines, add the following job:

```yaml
e2e-validation:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install
    - run: pnpm build
    - run: pnpm test:e2e
```

## Success Criteria

The spike validation is successful when:

- [x] `pnpm test:e2e` passes all tests
- [x] `pnpm validate:spike` completes without errors
- [x] GET `/` returns `{ "message": "Hello Cloudwerk" }` with status 200
- [x] GET `/unknown` returns status 404
- [x] Server starts within 15 seconds
- [x] Server stops cleanly (no zombie processes)
