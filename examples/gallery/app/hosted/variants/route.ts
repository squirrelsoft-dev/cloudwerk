import type { CloudwerkHandlerContext } from '@cloudwerk/core'
import { json } from '@cloudwerk/core'
import { getBinding } from '@cloudwerk/core/bindings'

const VARIANTS_API = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/variants`

interface VariantOptions {
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
  width?: number
  height?: number
  metadata?: 'keep' | 'copyright' | 'none'
}

interface Variant {
  id: string
  options: VariantOptions
  neverRequireSignedURLs?: boolean
}

interface VariantsResponse {
  result: {
    variants: Record<string, Variant>
  }
  success: boolean
  errors: Array<{ code: number; message: string }>
}

// Variants we need for the gallery example
const REQUIRED_VARIANTS: Variant[] = [
  {
    id: 'thumbnail',
    options: {
      fit: 'cover',
      width: 128,
      height: 128,
      metadata: 'none',
    },
    neverRequireSignedURLs: true,
  },
  {
    id: 'display',
    options: {
      fit: 'contain',
      width: 1280,
      height: 720,
      metadata: 'none',
    },
    neverRequireSignedURLs: true,
  },
]

/**
 * GET /hosted/variants - List existing variants
 */
export async function GET(_request: Request, _context: CloudwerkHandlerContext) {
  const accountId = getBinding<string>('CF_ACCOUNT_ID')
  const token = getBinding<string>('CF_IMAGES_TOKEN')

  if (!accountId || !token) {
    return json(
      { error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN' },
      500
    )
  }

  try {
    const response = await fetch(VARIANTS_API(accountId), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = (await response.json()) as VariantsResponse

    if (!data.success) {
      return json(
        { error: data.errors?.[0]?.message || 'Failed to list variants' },
        500
      )
    }

    const variants = Object.values(data.result.variants)
    const requiredIds = REQUIRED_VARIANTS.map((v) => v.id)
    const existingIds = variants.map((v) => v.id)
    const missingIds = requiredIds.filter((id) => !existingIds.includes(id))

    return json({
      variants,
      required: REQUIRED_VARIANTS,
      missing: missingIds,
      ready: missingIds.length === 0,
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Failed to list variants' },
      500
    )
  }
}

/**
 * POST /hosted/variants - Create required variants
 */
export async function POST(_request: Request, _context: CloudwerkHandlerContext) {
  const accountId = getBinding<string>('CF_ACCOUNT_ID')
  const token = getBinding<string>('CF_IMAGES_TOKEN')

  if (!accountId || !token) {
    return json(
      { error: 'Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN' },
      500
    )
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const variant of REQUIRED_VARIANTS) {
    try {
      const response = await fetch(VARIANTS_API(accountId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variant),
      })

      const data = (await response.json()) as { success: boolean; errors?: Array<{ message: string }> }

      if (data.success) {
        results.push({ id: variant.id, success: true })
      } else {
        // Check if it already exists (error code 5409 or similar)
        const errorMessage = data.errors?.[0]?.message || 'Unknown error'
        if (errorMessage.includes('already exists')) {
          results.push({ id: variant.id, success: true, error: 'Already exists' })
        } else {
          results.push({ id: variant.id, success: false, error: errorMessage })
        }
      }
    } catch (error) {
      results.push({
        id: variant.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const allSuccess = results.every((r) => r.success)

  return json({
    success: allSuccess,
    results,
    message: allSuccess
      ? 'All variants created successfully!'
      : 'Some variants failed to create',
  })
}
