/**
 * Test fixture: Page with an action that throws an error.
 */

import type { PageProps, ActionArgs } from '@cloudwerk/core'

export async function action({ request }: ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'error') {
    throw new Error('Action error')
  }

  return { success: true }
}

export default function ActionErrorPage({ actionData }: PageProps & { actionData?: { success: boolean } }) {
  return (
    <div data-page="action-error">
      <h1>Action Error Test</h1>
      <form method="post">
        <input type="hidden" name="intent" value="error" />
        <button type="submit">Trigger Error</button>
      </form>
      {actionData?.success && <p data-success>Action succeeded!</p>}
    </div>
  )
}
