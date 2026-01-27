/**
 * Test fixture: Async page component (Server Component).
 */

// Simulate async data loading
async function getData() {
  return { message: 'Async data loaded' }
}

export default async function AsyncPage() {
  const data = await getData()
  return (
    <div>
      <h1>Async Page</h1>
      <p>{data.message}</p>
    </div>
  )
}
