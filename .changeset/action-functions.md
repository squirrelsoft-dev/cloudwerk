---
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
---

feat(core): implement action() functions for form submissions and mutations

- Add `ActionArgs`, `ActionFunction`, and `InferActionData` types mirroring loader pattern
- Add `actionData` prop to `PageProps` for re-rendering with action results
- Support both single `action()` export and named method exports (POST, PUT, PATCH, DELETE)
- Register POST/PUT/PATCH/DELETE handlers for pages with actions
- Handle Response returns (redirect, json) passed through directly
- Handle data returns by re-running loader and rendering with actionData
- Support `NotFoundError` and `RedirectError` in actions
