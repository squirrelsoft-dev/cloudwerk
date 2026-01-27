/**
 * Test fixture: Page with named method exports for actions.
 *
 * Demonstrates:
 * - Named method exports (POST, DELETE) instead of single action
 * - Different behavior per HTTP method
 * - POST for creating/updating
 * - DELETE for removing
 */

import type { PageProps, ActionArgs, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError, RedirectError, redirect } from '@cloudwerk/core'

interface Item {
  id: string
  name: string
}

interface ActionMethodsPageData {
  items: Item[]
}

interface ActionMethodsActionData {
  method: string
  action?: string
  itemId?: string
  itemName?: string
  deleted?: boolean
  error?: string
}

/**
 * Loader that provides initial items list.
 */
export async function loader({ params: _params }: LoaderArgs): Promise<ActionMethodsPageData> {
  return {
    items: [
      { id: '1', name: 'Item One' },
      { id: '2', name: 'Item Two' },
      { id: '3', name: 'Item Three' },
    ],
  }
}

/**
 * POST handler for creating/updating items.
 */
export async function POST({
  request,
}: ActionArgs): Promise<Response | ActionMethodsActionData> {
  const formData = await request.formData()
  const name = formData.get('name')?.toString()
  const intent = formData.get('intent')?.toString()

  // Test redirect after POST
  if (intent === 'redirect') {
    return redirect('/action-methods?created=true')
  }

  // Test NotFoundError in action
  if (intent === 'notfound') {
    throw new NotFoundError('Item not found')
  }

  // Test RedirectError in action
  if (intent === 'redirect-error') {
    throw new RedirectError('/action-methods?redirect-error=true', 302)
  }

  return {
    method: 'POST',
    action: 'create',
    itemName: name ?? 'unnamed',
  }
}

/**
 * DELETE handler for removing items.
 */
export async function DELETE({
  request,
}: ActionArgs): Promise<ActionMethodsActionData> {
  const formData = await request.formData()
  const itemId = formData.get('itemId')?.toString()

  return {
    method: 'DELETE',
    action: 'delete',
    itemId,
    deleted: true,
  }
}

/**
 * PUT handler for updating items.
 */
export async function PUT({
  request,
}: ActionArgs): Promise<ActionMethodsActionData> {
  const formData = await request.formData()
  const itemId = formData.get('itemId')?.toString()
  const name = formData.get('name')?.toString()

  return {
    method: 'PUT',
    action: 'update',
    itemId,
    itemName: name,
  }
}

/**
 * PATCH handler for partial updates.
 */
export async function PATCH({
  request,
}: ActionArgs): Promise<ActionMethodsActionData> {
  const formData = await request.formData()
  const itemId = formData.get('itemId')?.toString()
  const field = formData.get('field')?.toString()

  return {
    method: 'PATCH',
    action: `patch-${field}`,
    itemId,
  }
}

export default function ActionMethodsPage({
  params: _params,
  searchParams,
  actionData,
  items,
}: PageProps & ActionMethodsPageData & { actionData?: ActionMethodsActionData }) {
  return (
    <div data-page="action-methods">
      <h1>Action Methods Test Page</h1>

      {searchParams.created && (
        <p data-created>Item created via redirect!</p>
      )}

      {searchParams['redirect-error'] && (
        <p data-redirect-error>Redirected via RedirectError!</p>
      )}

      {actionData && (
        <div data-action-result>
          <p data-method>Method: {actionData.method}</p>
          <p data-action>Action: {actionData.action}</p>
          {actionData.itemId && <p data-item-id>Item ID: {actionData.itemId}</p>}
          {actionData.itemName && <p data-item-name>Item Name: {actionData.itemName}</p>}
          {actionData.deleted && <p data-deleted>Item deleted!</p>}
        </div>
      )}

      <h2>Items</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-item={item.id}>
            {item.name}
          </li>
        ))}
      </ul>

      <h2>Create Item (POST)</h2>
      <form method="post">
        <input type="text" name="name" placeholder="Item name" />
        <button type="submit" name="intent" value="create">
          Create
        </button>
        <button type="submit" name="intent" value="redirect">
          Create and Redirect
        </button>
        <button type="submit" name="intent" value="notfound">
          Trigger NotFoundError
        </button>
        <button type="submit" name="intent" value="redirect-error">
          Trigger RedirectError
        </button>
      </form>
    </div>
  )
}
