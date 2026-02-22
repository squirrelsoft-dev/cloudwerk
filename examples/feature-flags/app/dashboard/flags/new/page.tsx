import { listSegments } from '@/services/flags/service'
import type { Segment } from '@/lib/types'
import FlagForm from '@/components/FlagForm'

export async function loader() {
  const segments = await listSegments()
  return { segments }
}

interface PageProps {
    segments: Segment[]
}

export default function NewFlagPage({ segments }: PageProps) {
    return (
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <a
                    href="/dashboard"
                    class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Flags
                </a>
            </div>

            <h1 class="text-2xl font-bold mb-8">Create Feature Flag</h1>

            <FlagForm segments={segments} />
        </div>
    )
}
