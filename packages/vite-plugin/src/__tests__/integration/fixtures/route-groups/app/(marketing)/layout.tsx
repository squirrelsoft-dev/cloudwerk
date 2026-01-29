import type { LayoutProps } from '@cloudwerk/core'

export default function MarketingLayout({ children }: LayoutProps) {
  return (
    <div data-testid="marketing-layout">
      <header data-testid="marketing-header">Marketing Header</header>
      {children}
    </div>
  )
}
