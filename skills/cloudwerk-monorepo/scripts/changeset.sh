#!/usr/bin/env bash
set -e

# Create a changeset file for the Cloudwerk monorepo
# Usage: ./changeset.sh

CHANGESET_DIR=".changeset"

# Generate a random name for the changeset file
RANDOM_NAME=$(head -c 16 /dev/urandom | shasum | head -c 8)
CHANGESET_FILE="${CHANGESET_DIR}/${RANDOM_NAME}.md"

echo "Creating changeset file: ${CHANGESET_FILE}"
echo ""
echo "Available packages:"
echo "  @cloudwerk/core"
echo "  @cloudwerk/cli"
echo "  @cloudwerk/ui"
echo "  @cloudwerk/auth"
echo "  @cloudwerk/queue"
echo "  @cloudwerk/trigger"
echo "  @cloudwerk/durable-object"
echo "  @cloudwerk/service"
echo ""

read -rp "Package name (e.g., @cloudwerk/core): " PACKAGE
read -rp "Bump type (patch/minor/major): " BUMP
read -rp "Description: " DESCRIPTION

mkdir -p "${CHANGESET_DIR}"

cat > "${CHANGESET_FILE}" <<EOF
---
"${PACKAGE}": ${BUMP}
---

${DESCRIPTION}
EOF

echo ""
echo "Created changeset: ${CHANGESET_FILE}"
echo ""
cat "${CHANGESET_FILE}"
