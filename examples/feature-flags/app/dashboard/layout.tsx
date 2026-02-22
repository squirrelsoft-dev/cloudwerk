import { getUser } from '@cloudwerk/auth'
import type { LayoutProps } from '@cloudwerk/core/runtime'
import SignOutButton from '@/components/SignOutButton'

export async function loader() {
    const user = getUser()
    return { user }
}

interface DashboardLayoutProps extends LayoutProps {
    user: {
        id: string
        name: string
        email: string
        image?: string
    }
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
    return (
        <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Dashboard Header */}
            <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div class="flex items-center gap-6">
                            <a href="/dashboard" class="flex items-center gap-2">
                                <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
                                <span class="text-xl font-bold">FlagShip</span>
                            </a>
                            <nav class="hidden md:flex items-center gap-1">
                                <a
                                    href="/dashboard"
                                    class="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Dashboard
                                </a>
                                <a
                                    href="/dashboard/flags"
                                    class="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Flags
                                </a>
                                <a
                                    href="/dashboard/segments"
                                    class="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Segments
                                </a>
                                <a
                                    href="/dashboard/audit"
                                    class="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Audit Log
                                </a>
                            </nav>
                        </div>

                        {/* User menu */}
                        <div class="flex items-center gap-4">
                            <a
                                href="/docs"
                                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                Docs
                            </a>
                            <div class="flex items-center gap-3">
                                <div class="text-right hidden sm:block">
                                    <div class="text-sm font-medium">{user.name}</div>
                                    <div class="text-xs text-gray-500">{user.email}</div>
                                </div>
                                {user.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name}
                                        class="w-9 h-9 rounded-full"
                                    />
                                ) : (
                                    <div class="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                        <span class="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <SignOutButton />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main>{children}</main>
        </div>
    )
}
