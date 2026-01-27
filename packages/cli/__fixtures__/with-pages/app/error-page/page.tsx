/**
 * Test fixture: Page that throws an error.
 */

export default function ErrorPage() {
  throw new Error('Test error from page component')
  return <div>This will never render</div>
}
