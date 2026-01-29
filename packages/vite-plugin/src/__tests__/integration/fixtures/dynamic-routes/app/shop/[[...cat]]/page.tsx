import type { PageProps } from '@cloudwerk/core'

export default function ShopPage({ params }: PageProps<{ cat?: string }>) {
  return (
    <div data-testid="shop-page">
      <h1>Shop</h1>
      <p data-testid="shop-category">Category: {params.cat || 'All Products'}</p>
    </div>
  )
}
