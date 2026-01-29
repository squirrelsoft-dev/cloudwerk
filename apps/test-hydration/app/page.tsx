import Counter from './components/counter'

export default function HomePage() {
    return (
        <html>
            <head>
                <title>Hydration Test</title>
            </head>
            <body>
                <h1>Hydration Test</h1>
                <p>Click the button below. If hydration works, the count should increment.</p>
                <Counter />
                <p style={{ marginTop: '20px', color: '#666' }}>
                    Check the browser console for debug messages.
                </p>
                <img src="logo.svg" alt="Logo" width="200" />
            </body>
        </html>
    )
}
