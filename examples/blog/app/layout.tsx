import type { LayoutProps } from '@cloudwerk/core'
import stylesUrl from './styles.css?url'

export default function RootLayout({ children }: LayoutProps) {
    return (
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Blog - Cloudwerk</title>
                <link rel="stylesheet" href={stylesUrl} />
            </head>
            <body>
                {children}
            </body>
        </html>
    )
}
