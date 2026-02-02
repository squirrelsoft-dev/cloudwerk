'use client'

import { useState } from 'hono/jsx'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button
      onClick={() => setCount((c) => c + 1)}
      class="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
    >
      Count is {count}
    </button>
  )
}
