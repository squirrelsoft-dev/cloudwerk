import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
    return (
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>SSG Example</title>
            </head>
            <body>
                {children}
            </body>
        </html>
    )
}
