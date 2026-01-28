# Plan: Address TODO Comments

This plan addresses the TODO comments created during PR review fixes.

## TODO Items

### 1. Create `@cloudwerk/utils` Package (Medium Priority)

**Location:** `packages/ui/src/clientWrapper.tsx:28`

**Problem:** `serializeProps` is duplicated between `@cloudwerk/core` and `@cloudwerk/ui` because importing from core would pull in Node.js dependencies into the browser bundle.

**Solution:** Create a new `@cloudwerk/utils` package with browser-safe utilities.

#### Implementation Steps

- [ ] Create package structure at `packages/utils/`
  ```
  packages/utils/
  ├── package.json
  ├── tsconfig.json
  ├── tsup.config.ts
  └── src/
      ├── index.ts
      ├── serialize.ts      # serializeProps, deserializeProps
      ├── escape.ts         # escapeHtmlAttribute
      └── __tests__/
          ├── serialize.test.ts
          └── escape.test.ts
  ```

- [ ] Configure package.json
  - Name: `@cloudwerk/utils`
  - No Node.js dependencies
  - ESM only
  - Browser and Node.js compatible

- [ ] Move shared utilities
  - `serializeProps` from `packages/core/src/client.ts`
  - `deserializeProps` from `packages/core/src/client.ts`
  - `escapeHtmlAttribute` from `packages/ui/src/clientWrapper.tsx`

- [ ] Update consumers
  - `packages/core/src/client.ts` → import from `@cloudwerk/utils`
  - `packages/ui/src/clientWrapper.tsx` → import from `@cloudwerk/utils`

- [ ] Add to workspace and CI
  - Update `pnpm-workspace.yaml` if needed
  - Ensure build order in CI

- [ ] Remove TODO comments after completion

#### Acceptance Criteria

- [ ] `@cloudwerk/utils` builds successfully
- [ ] No Node.js-only APIs in the package
- [ ] Bundle size of `@cloudwerk/ui` client entry unchanged or smaller
- [ ] All existing tests pass
- [ ] New tests for moved utilities

---

### 2. Replace Regex Parsing with AST Parser (Low Priority)

**Location:** `packages/vite-plugin/src/plugin.ts:53`

**Problem:** `transformClientComponent` uses regex to detect and transform export patterns. This is fragile and can fail on:
- Comments containing export patterns
- String literals containing export patterns
- Complex or unusual export syntax

**Solution:** Use an AST parser (Babel or SWC) for robust code transformation.

#### Options Analysis

| Parser | Pros | Cons |
|--------|------|------|
| **Babel** | Well-documented, mature ecosystem, TypeScript support | Slower, larger dependency |
| **SWC** | Very fast (Rust-based), TypeScript-native | Smaller ecosystem, less documentation |
| **@babel/parser + magic-string** | Lightweight, parse-only | Need manual AST traversal |

**Recommendation:** Use `@swc/core` for speed, or `@babel/parser` + `@babel/traverse` for ecosystem familiarity.

#### Implementation Steps

- [ ] Add parser dependency
  ```bash
  pnpm --filter @cloudwerk/vite-plugin add @swc/core
  # OR
  pnpm --filter @cloudwerk/vite-plugin add @babel/parser @babel/traverse @babel/generator
  ```

- [ ] Create new transformation module
  ```typescript
  // packages/vite-plugin/src/transforms/client-component.ts
  import { parse } from '@swc/core'

  export function transformClientComponent(
    code: string,
    componentId: string,
    bundlePath: string
  ): string {
    const ast = parse(code, { syntax: 'typescript', tsx: true })
    // Find and transform default export
    // Add wrapper import
    // Return transformed code
  }
  ```

- [ ] Handle all export patterns
  - `export default function Name() {}`
  - `export default Name` (identifier reference)
  - `export default () => {}` (arrow function)
  - `export default class Name {}`
  - `export { Name as default }`

- [ ] Add comprehensive tests
  - Edge cases with comments
  - String literals containing "export default"
  - Mixed export patterns

- [ ] Remove regex-based implementation and TODO comment

#### Acceptance Criteria

- [ ] All current client components transform correctly
- [ ] Edge cases handled (comments, strings, complex exports)
- [ ] Build time impact acceptable (< 100ms increase)
- [ ] Tests cover all export patterns

---

### 3. Make `appDir` Configurable (Low Priority)

**Location:** `packages/cli/src/commands/build.ts:107`

**Problem:** `appDir` is hardcoded to `'app'` in the build command. Should be configurable via `CloudwerkConfig`.

**Solution:** Add `appDir` to `CloudwerkConfig` type and wire it through the system.

#### Implementation Steps

- [ ] Update types in `packages/core/src/types.ts`
  ```typescript
  export interface CloudwerkConfig {
    // ... existing fields
    appDir?: string  // Default: 'app'
  }
  ```

- [ ] Update config defaults in `packages/core/src/config.ts`
  ```typescript
  export const DEFAULT_CONFIG: CloudwerkConfig = {
    // ... existing defaults
    appDir: 'app',
  }
  ```

- [ ] Update mergeConfig to handle appDir

- [ ] Update consumers
  - `packages/cli/src/commands/build.ts`
  - `packages/cli/src/commands/dev.ts` (if applicable)
  - `packages/vite-plugin/src/plugin.ts`

- [ ] Update documentation
  - Add `appDir` to config reference docs

- [ ] Remove TODO comment after completion

#### Acceptance Criteria

- [ ] `appDir` configurable in `cloudwerk.config.ts`
- [ ] Default remains `'app'` for backward compatibility
- [ ] Custom values work in both dev and build
- [ ] Documentation updated

---

## Priority Order

1. **`@cloudwerk/utils` package** - Medium priority
   - Reduces code duplication
   - Cleaner architecture
   - Prepares for future shared utilities

2. **`appDir` configuration** - Low priority
   - Simple change
   - Can be done quickly
   - Low user demand currently

3. **AST parser for transforms** - Low priority
   - Current regex works for common cases
   - Only needed if edge cases become problematic
   - Higher implementation cost

## Notes

- All changes should include tests
- Run `pnpm build && pnpm test` after each change
- Create changesets for any package changes
- Consider backward compatibility for config changes
