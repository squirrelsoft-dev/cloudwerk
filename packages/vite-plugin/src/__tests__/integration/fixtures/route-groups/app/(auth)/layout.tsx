import type { LayoutProps } from '@cloudwerk/core'

export default function AuthLayout({ children }: LayoutProps) {
  return (
    <div data-testid="auth-layout">
      <div data-testid="auth-container">{children}</div>
    </div>
  )
}
