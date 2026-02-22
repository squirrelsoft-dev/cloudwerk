import SegmentForm from '@/components/SegmentForm'

export default function NewSegmentPage() {
    return (
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <a
                    href="/dashboard/segments"
                    class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Segments
                </a>
            </div>

            <h1 class="text-2xl font-bold mb-8">Create Segment</h1>

            <SegmentForm />
        </div>
    )
}
