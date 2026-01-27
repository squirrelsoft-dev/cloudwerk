/**
 * Test fixture: Page that throws an error in loader.
 */


export async function loader() {
  throw new Error('Test error from loader')
}

export default function ThrowsErrorPage() {
  return (
    <div data-page="throws-error">
      <h1>This should not render</h1>
    </div>
  )
}
