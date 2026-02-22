import { getFlag, listSegments } from '@/services/flags/service'
import type { Flag, Segment } from '@/lib/types'
import { NotFoundError, type LoaderArgs } from '@cloudwerk/core/runtime'
import FlagForm from '@/components/FlagForm'

export async function loader({ params }: LoaderArgs) {
  const id = params.id
  if (!id) {
    throw new NotFoundError('Flag not found')
  }

  const [flag, segments] = await Promise.all([getFlag(id), listSegments()])

  if (!flag) {
    throw new NotFoundError('Flag not found')
  }

  return { flag, segments }
}

interface PageProps {
    flag: Flag
    segments: Segment[]
}

export default function EditFlagPage({ flag, segments }: PageProps) {
    return (
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <a
                    href={`/dashboard/flags/${flag.id}`}
                    class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Flag
                </a>
            </div>

            <h1 class="text-2xl font-bold mb-8">Edit Flag: {flag.name}</h1>

            <FlagForm flag={flag} segments={segments} />
        </div>
    )
}
