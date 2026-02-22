---
title: Route Groups
impact: MEDIUM
tags: params, groups, layout, organization
---

## Route Groups

**Impact: MEDIUM**

Route groups use `(groupName)` parentheses syntax in directory names. They organize routes and apply shared layouts without affecting the URL path.

**Incorrect (layout affects URL):**

```
// ❌ "marketing" becomes part of the URL: /marketing/about
app/marketing/about/page.tsx
app/marketing/pricing/page.tsx
```

**Correct (route group for layout grouping):**

```
// ✅ Group doesn't appear in URL: /about, /pricing
app/(marketing)/about/page.tsx
app/(marketing)/pricing/page.tsx
app/(marketing)/layout.tsx        ← shared layout for marketing pages

app/(dashboard)/settings/page.tsx
app/(dashboard)/profile/page.tsx
app/(dashboard)/layout.tsx        ← different layout for dashboard pages
```

```tsx
// app/(marketing)/layout.tsx
import type { LayoutProps } from '@cloudwerk/core'

export default function MarketingLayout({ children }: LayoutProps) {
  return (
    <div>
      <nav>Marketing Nav</nav>
      <main>{children}</main>
      <footer>Marketing Footer</footer>
    </div>
  )
}
```

Key points:
- Parentheses `(name)` are stripped from the URL path
- Useful for applying different layouts to different sets of pages
- Multiple groups can exist at the same level
- Each group can have its own `layout.tsx` and `middleware.ts`
- Groups can be nested: `app/(auth)/(settings)/page.tsx`
