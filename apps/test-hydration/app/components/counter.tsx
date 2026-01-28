'use client'

import { useState } from 'hono/jsx'

export default function Counter() {
  const [count, setCount] = useState(0)

  console.log('[Counter] Rendering with count:', count)

  return (
    <button
      onClick={() => {
        console.log('[Counter] Button clicked!')
        setCount((c) => c + 1)
      }}
      style={{
        padding: '10px 20px',
        fontSize: '18px',
        cursor: 'pointer',
      }}
    >
      Count: {count}
    </button>
  )
}
