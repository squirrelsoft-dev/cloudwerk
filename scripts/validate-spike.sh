#!/bin/bash
#
# Cloudwerk Spike Validation Script
#
# Manual validation script for the v0.1.0 spike. This script:
# 1. Builds all packages
# 2. Scaffolds a test project
# 3. Patches package.json for local packages
# 4. Installs dependencies
# 5. Starts the dev server
# 6. Validates the HTTP response
#
# Usage:
#   ./scripts/validate-spike.sh
#   PORT=3456 ./scripts/validate-spike.sh
#

set -e

# ============================================================================
# Colors
# ============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Configuration
# ============================================================================

PORT=${PORT:-3456}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR=$(mktemp -d)
PROJECT_NAME="cloudwerk-spike-test"
PROJECT_DIR="$TEST_DIR/$PROJECT_NAME"
SERVER_PID=""

# ============================================================================
# Cleanup Function
# ============================================================================

cleanup() {
  echo ""
  echo -e "${YELLOW}[Cleanup] Cleaning up...${NC}"

  # Stop server if running
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${YELLOW}[Cleanup] Stopping dev server (PID: $SERVER_PID)...${NC}"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi

  # Remove temp directory
  if [ -d "$TEST_DIR" ]; then
    echo -e "${YELLOW}[Cleanup] Removing temp directory: $TEST_DIR${NC}"
    rm -rf "$TEST_DIR"
  fi

  echo -e "${YELLOW}[Cleanup] Done.${NC}"
}

# Register cleanup on exit
trap cleanup EXIT

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}"
}

print_step() {
  echo ""
  echo -e "${YELLOW}[Step $1] $2${NC}"
}

print_success() {
  echo -e "${GREEN}$1${NC}"
}

print_error() {
  echo -e "${RED}$1${NC}"
}

wait_for_server() {
  local url="$1"
  local max_attempts="${2:-30}"
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      return 0
    fi

    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      print_error "Server process died unexpectedly"
      return 1
    fi

    echo "  Attempt $attempt/$max_attempts - waiting for server..."
    sleep 1
    attempt=$((attempt + 1))
  done

  return 1
}

# ============================================================================
# Main Script
# ============================================================================

print_header "Cloudwerk Spike Validation"
echo "Monorepo root: $MONOREPO_ROOT"
echo "Test directory: $TEST_DIR"
echo "Port: $PORT"

# --------------------------------------------------------------------------
# Step 1: Build packages
# --------------------------------------------------------------------------

print_step 1 "Building packages..."
cd "$MONOREPO_ROOT"
pnpm build
print_success "  Packages built successfully"

# --------------------------------------------------------------------------
# Step 2: Scaffold test project
# --------------------------------------------------------------------------

print_step 2 "Scaffolding test project..."
node "$MONOREPO_ROOT/apps/create-cloudwerk-app/dist/index.js" "$PROJECT_DIR"
print_success "  Project scaffolded at: $PROJECT_DIR"

# --------------------------------------------------------------------------
# Step 3: Patch package.json for local packages
# --------------------------------------------------------------------------

print_step 3 "Patching package.json for local packages..."
cd "$PROJECT_DIR"

# Use Node.js for cross-platform JSON manipulation
node -e "
const fs = require('fs');
const path = require('path');
const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.dependencies['@cloudwerk/core'] = 'file:$MONOREPO_ROOT/packages/core';
pkg.dependencies['@cloudwerk/cli'] = 'file:$MONOREPO_ROOT/packages/cli';

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('  Updated @cloudwerk/core:', pkg.dependencies['@cloudwerk/core']);
console.log('  Updated @cloudwerk/cli:', pkg.dependencies['@cloudwerk/cli']);
"
print_success "  package.json patched"

# --------------------------------------------------------------------------
# Step 4: Install dependencies
# --------------------------------------------------------------------------

print_step 4 "Installing dependencies..."
pnpm install
print_success "  Dependencies installed"

# --------------------------------------------------------------------------
# Step 5: Start dev server
# --------------------------------------------------------------------------

print_step 5 "Starting dev server on port $PORT..."
pnpm dev --port "$PORT" &
SERVER_PID=$!
echo "  Server PID: $SERVER_PID"

# Wait for server to be ready
echo "  Waiting for server to be ready..."
if wait_for_server "http://localhost:$PORT" 30; then
  print_success "  Server is ready!"
else
  print_error "  FAILURE: Server did not start within 30 seconds"
  exit 1
fi

# --------------------------------------------------------------------------
# Step 6: Validate response
# --------------------------------------------------------------------------

print_step 6 "Validating HTTP response..."

echo "  GET http://localhost:$PORT/"
RESPONSE=$(curl -s "http://localhost:$PORT/")
echo "  Response: $RESPONSE"

# Check if response contains expected message
if echo "$RESPONSE" | grep -q '"message":"Hello Cloudwerk"'; then
  print_success "  Response is correct!"
else
  print_error "  FAILURE: Unexpected response"
  print_error "  Expected: {\"message\":\"Hello Cloudwerk\"}"
  print_error "  Got: $RESPONSE"
  exit 1
fi

# Test 404 response
echo ""
echo "  GET http://localhost:$PORT/unknown"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/unknown")
echo "  Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "404" ]; then
  print_success "  404 response is correct!"
else
  print_error "  FAILURE: Expected 404, got $HTTP_STATUS"
  exit 1
fi

# ============================================================================
# Success
# ============================================================================

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}SUCCESS: Spike validation passed!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "The complete Cloudwerk spike flow works:"
echo "  1. scaffold -> Creates project structure"
echo "  2. install  -> Installs dependencies"
echo "  3. dev      -> Starts development server"
echo "  4. request  -> Returns { \"message\": \"Hello Cloudwerk\" }"
echo ""
echo "v0.1.0 milestone is ready!"
