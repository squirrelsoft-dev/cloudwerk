# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## Adding a Changeset

When you make changes that should be released, run:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed (`@cloudwerk/core`, `@cloudwerk/cli`, or both)
2. Choose the semver bump type (major, minor, patch)
3. Write a summary of the changes

A markdown file will be created in the `.changeset` directory. Commit this file with your PR.

## Bump Types

- **patch**: Bug fixes and minor updates (0.0.X)
- **minor**: New features, backwards compatible (0.X.0)
- **major**: Breaking changes (X.0.0)

## Release Process

1. When PRs with changesets are merged to `main`, a "Version Packages" PR is automatically created/updated
2. The Version Packages PR aggregates all changesets and updates:
   - Package versions in `package.json`
   - `CHANGELOG.md` files
3. When the Version Packages PR is merged, packages are automatically published to npm

## Linked Packages

`@cloudwerk/core` and `@cloudwerk/cli` are linked, meaning they will always be released together with the same version bump type.
