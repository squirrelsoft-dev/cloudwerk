import { json } from '@cloudwerk/core'

export function GET() {
  return json({ message: 'Hello Cloudwerk' })
}
