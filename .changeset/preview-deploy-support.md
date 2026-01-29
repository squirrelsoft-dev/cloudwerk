---
"@cloudwerk/cli": minor
"@cloudwerk/vite-plugin": minor
---

Add preview deployment support with `cloudwerk deploy` command

- Add `cloudwerk deploy` CLI command that wraps `wrangler deploy` with environment support
- Add `--env` flag to deploy to specific Cloudflare Workers environments (e.g., preview)
- Add `--dry-run` flag to preview deployment without executing
- Add `--skip-build` flag to skip the build step
- Update wrangler.toml templates with Workers Static Assets configuration and preview environment
- Add `preview` and `deploy` npm scripts to all templates
- Fix production hydration by pre-scanning client components and using static imports
- Add static asset serving via Workers Static Assets binding in production builds
