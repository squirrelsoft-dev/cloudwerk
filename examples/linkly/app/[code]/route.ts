/**
 * GET /[code] - Redirect to original URL
 */

import type { CloudwerkHandler, CloudwerkHandlerContext } from '@cloudwerk/core'
import { redirect, notFoundResponse, getContext } from '@cloudwerk/core'
import { getLinkByCode, incrementClicks } from '../lib/db'
import { getCachedUrl, cacheUrl } from '../lib/cache'

interface Params {
  code: string
}

export const GET: CloudwerkHandler<Params> = async (
  _request,
  { params }: CloudwerkHandlerContext<Params>
) => {
  const { code } = params
  const { executionCtx } = getContext()

  // Try cache first (fast path)
  let url = await getCachedUrl(code)

  if (url) {
    // Track click in background
    executionCtx.waitUntil(incrementClicks(code))
    return redirect(url, 302)
  }

  // Cache miss - check database
  const link = await getLinkByCode(code)

  if (!link) {
    return notFoundResponse('Link not found')
  }

  url = link.url

  // Cache for next time and track click in background
  executionCtx.waitUntil(
    Promise.all([
      cacheUrl(code, url),
      incrementClicks(code),
    ])
  )

  return redirect(url, 302)
}
