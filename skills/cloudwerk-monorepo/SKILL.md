---
name: cloudwerk-monorepo
description: Monorepo workflow for the Cloudwerk framework. Use when building, testing, or releasing Cloudwerk packages. Covers pnpm workspace commands, package structure, changeset requirements, and test workflows. Triggers on tasks involving building packages, running tests, creating changesets, or understanding the monorepo structure.
license: MIT
metadata:
  author: squirrelsoft
  version: "0.1.0"
---

# Cloudwerk Monorepo

Workflow guide for the Cloudwerk pnpm monorepo. Covers building, testing, changesets, and package relationships.

## When to Apply

Reference these guidelines when:
- Building or testing Cloudwerk packages
- Creating changesets for version bumps
- Understanding package dependencies
- Adding new packages to the monorepo
- Running the dev server

## Package Structure

| Package | Path | Description |
|---------|------|-------------|
| @cloudwerk/core | `packages/core/` | Route compiler, types, config, runtime helpers |
| @cloudwerk/cli | `packages/cli/` | Dev server, route registration with Hono |
| @cloudwerk/ui | `packages/ui/` | SSR renderer abstraction |
| @cloudwerk/auth | `packages/auth/` | Authentication, OAuth, sessions |
| @cloudwerk/queue | `packages/queue/` | Cloudflare Queue consumer/producer |
| @cloudwerk/trigger | `packages/trigger/` | Cron triggers, scheduled tasks |
| @cloudwerk/durable-object | `packages/durable-object/` | Durable Object utilities |
| @cloudwerk/service | `packages/service/` | Service bindings and RPC |

## Commands

All commands run from the repo root:

```bash
# Build all packages (required before testing cross-package changes)
pnpm build

# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @cloudwerk/core test
pnpm --filter @cloudwerk/cli test

# Run a single test file
pnpm --filter @cloudwerk/cli vitest --run src/server/__tests__/registerRoutes.page.test.ts

# Watch mode
pnpm --filter @cloudwerk/core test:watch

# Lint
pnpm lint

# Dev server
pnpm dev
```

## Changeset Workflow

**Every PR that changes package behavior MUST include a changeset file.**

Create a changeset by adding a markdown file to `.changeset/`:

```markdown
---
"@cloudwerk/core": patch
---

Description of the change.
```

Or use the helper script:

```bash
skills/cloudwerk-monorepo/scripts/changeset.sh
```

Bump types:
- `patch` — Bug fixes, minor improvements
- `minor` — New features, non-breaking changes
- `major` — Breaking API changes

## Adding New Packages

When creating a new package that will be published to npm, the initial version **must be published manually** before the automated release pipeline can take over. Inform the user:

> "This is a new package. Before the automated release works, you'll need to publish the initial version manually and set up npm access."
