---
title: Action Function for Mutations
impact: HIGH
tags: action, form, mutation, post
---

## Action Function for Mutations

**Impact: HIGH**

The `action()` export handles form submissions and mutations (POST, PUT, PATCH, DELETE requests) on page routes. Actions run server-side and can return data or redirect.

**Incorrect (handling POST in a separate API route for a page form):**

```typescript
// ❌ Creating a separate API route for a page's form
// app/api/contact/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  await sendMessage(formData)
  return json({ success: true })
}

// app/contact/page.tsx — has to fetch manually
export default function ContactPage() {
  const handleSubmit = async (e) => {
    const res = await fetch('/api/contact', { method: 'POST', body: new FormData(e.target) })
    // ...
  }
  return <form onSubmit={handleSubmit}>...</form>
}
```

**Correct (action export on the page):**

```tsx
// app/contact/page.tsx
import type { ActionArgs, PageProps } from '@cloudwerk/core'
import { redirect } from '@cloudwerk/core'

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const message = formData.get('message') as string

  const errors: Record<string, string> = {}
  if (!name) errors.name = 'Name is required'
  if (!message) errors.message = 'Message is required'

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  await sendMessage({ name, message })
  return redirect('/contact/thanks')
}

interface ContactPageProps extends PageProps {
  actionData?: { errors?: Record<string, string> }
}

export default function ContactPage({ actionData }: ContactPageProps) {
  return (
    <form method="post">
      <input name="name" />
      {actionData?.errors?.name && <p>{actionData.errors.name}</p>}
      <textarea name="message" />
      {actionData?.errors?.message && <p>{actionData.errors.message}</p>}
      <button type="submit">Send</button>
    </form>
  )
}
```

Key points:
- Export `action` as a named async function from a page file
- `ActionArgs` provides `{ params, request, context }`
- Return a `Response` (e.g., `redirect()`) to skip re-render
- Return data to re-render the page with `actionData` prop
- Named method exports (`POST`, `PUT`, `DELETE`) also work for method-specific handling
- Throw `NotFoundError` or `RedirectError` for control flow

Reference: `packages/core/src/types.ts` (ActionArgs, ActionFunction types)
