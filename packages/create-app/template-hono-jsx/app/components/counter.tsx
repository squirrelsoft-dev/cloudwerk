'use client'

import { useState } from 'hono/jsx'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount((c) => c + 1)}>
      Count: {count}
    </button>
  )
}
