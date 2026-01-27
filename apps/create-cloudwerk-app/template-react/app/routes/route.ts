import { json } from '@cloudwerk/core'
import type { Context } from '@cloudwerk/core'

export const GET = (_c: Context) => {
  return json({ message: 'Hello Cloudwerk' })
}
