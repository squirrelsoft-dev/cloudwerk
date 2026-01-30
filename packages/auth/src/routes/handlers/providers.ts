/**
 * @cloudwerk/auth - Providers Route Handler
 *
 * GET /auth/providers - Returns list of available providers.
 */

import type { AuthRouteContext, ProvidersResponse } from '../types.js'

/**
 * Handle GET /auth/providers request.
 *
 * Returns the list of configured authentication providers.
 *
 * @param ctx - Auth route context
 * @returns JSON response with provider list
 */
export async function handleProviders(
  ctx: AuthRouteContext
): Promise<Response> {
  const providers: ProvidersResponse['providers'] = []

  for (const [id, provider] of ctx.providers) {
    providers.push({
      id,
      name: provider.name,
      type: provider.type,
    })
  }

  const response: ProvidersResponse = { providers }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      ...Object.fromEntries(ctx.responseHeaders),
    },
  })
}
