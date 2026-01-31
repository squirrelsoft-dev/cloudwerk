import { getContext, LoaderArgs, type PageProps } from '@cloudwerk/core'
import { getPosts, type Post } from './lib/db'
import PostCard from './components/PostCard'

export async function loader(_args: LoaderArgs) {
    // Test that getContext() works in loaders
    // console.log('loader called')
    // const ctx = getContext()
    // console.log('getContext() in loader - requestId:', ctx.requestId)

    const posts = await getPosts()
    return { posts }
}

interface HomePageProps extends PageProps {
    posts: Post[]
}

export default function HomePage({ posts }: HomePageProps) {
    return (
        <div class="min-h-screen bg-gray-100 py-12 px-4">
            <div class="max-w-2xl mx-auto">
                <header class="mb-12">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">My Blog</h1>
                    <p class="text-gray-600">
                        A personal blog built with Cloudwerk and Cloudflare Workers.
                    </p>
                    <nav class="mt-4 flex gap-4">
                        <a href="/" class="text-blue-600 hover:underline">Home</a>
                        <a href="/about" class="text-blue-600 hover:underline">About</a>
                    </nav>
                </header>

                <main>
                    <h2 class="text-2xl font-semibold text-gray-800 mb-6">Latest Posts</h2>
                    {posts.length > 0 ? (
                        <div class="space-y-6">
                            {posts.map((post) => (
                                <PostCard post={post} />
                            ))}
                        </div>
                    ) : (
                        <p class="text-gray-500">No posts yet.</p>
                    )}
                </main>
            </div>
        </div>
    )
}
