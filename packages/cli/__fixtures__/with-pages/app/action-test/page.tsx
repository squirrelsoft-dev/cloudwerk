/**
 * Test fixture: Page with basic action function.
 *
 * Demonstrates:
 * - Single action export (handles all mutation methods)
 * - Returning data to re-render page with actionData
 * - Returning redirect Response
 * - FormData handling
 */

import type { PageProps, ActionArgs, LoaderArgs } from '@cloudwerk/core'
import { redirect } from '@cloudwerk/core'

interface ActionTestPageData {
  message: string
}

interface ActionTestActionData {
  success?: boolean
  errors?: Record<string, string>
  formMessage?: string
}

/**
 * Loader that provides initial page data.
 */
export async function loader({ params: _params }: LoaderArgs): Promise<ActionTestPageData> {
  return {
    message: 'Submit the form to test actions',
  }
}

/**
 * Action that handles form submissions.
 * - If 'redirect' is submitted, redirects to /action-test?redirected=true
 * - If 'error' is submitted, returns validation errors
 * - Otherwise, returns success with the submitted message
 */
export async function action({
  request,
}: ActionArgs): Promise<Response | ActionTestActionData> {
  const formData = await request.formData()
  const intent = formData.get('intent')
  const message = formData.get('message')

  // Test redirect Response
  if (intent === 'redirect') {
    return redirect('/action-test?redirected=true')
  }

  // Test validation errors
  if (intent === 'error') {
    return {
      errors: {
        message: 'This is a validation error',
      },
    }
  }

  // Test success case
  return {
    success: true,
    formMessage: message?.toString() ?? 'No message provided',
  }
}

export default function ActionTestPage({
  params: _params,
  searchParams,
  actionData,
  message,
}: PageProps & ActionTestPageData & { actionData?: ActionTestActionData }) {
  return (
    <div data-page="action-test">
      <h1>Action Test Page</h1>
      <p data-loader-message>{message}</p>

      {searchParams.redirected && (
        <p data-redirected>Successfully redirected!</p>
      )}

      {actionData?.success && (
        <p data-success>Form submitted successfully: {actionData.formMessage}</p>
      )}

      {actionData?.errors && (
        <p data-error>Error: {actionData.errors.message}</p>
      )}

      <form method="post">
        <input type="text" name="message" placeholder="Enter a message" />
        <button type="submit" name="intent" value="submit">
          Submit
        </button>
        <button type="submit" name="intent" value="redirect">
          Submit and Redirect
        </button>
        <button type="submit" name="intent" value="error">
          Submit with Error
        </button>
      </form>
    </div>
  )
}
