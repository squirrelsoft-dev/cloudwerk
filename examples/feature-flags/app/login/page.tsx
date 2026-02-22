import { isAuthenticated } from "@cloudwerk/auth"
import { redirect } from "@cloudwerk/core"
import PasskeyLoginForm from "@/components/PasskeyLoginForm"

export async function loader() {
    // Redirect if already authenticated
    if (isAuthenticated()) {
        return redirect('/dashboard')
    }
    return {}
}

export default function LoginPage() {
    return (
        <main class="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div class="w-full max-w-md">
                {/* Logo */}
                <div class="text-center mb-8">
                    <a href="/" class="inline-flex items-center gap-2">
                        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl" />
                        <span class="text-2xl font-bold">FlagShip</span>
                    </a>
                </div>

                {/* Card */}
                <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
                    <div class="text-center mb-8">
                        <h1 class="text-2xl font-bold mb-2">Welcome back</h1>
                        <p class="text-gray-600 dark:text-gray-400">
                            Sign in to your account to continue
                        </p>
                    </div>

                    <PasskeyLoginForm />

                    <div class="relative my-8">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-4 bg-white dark:bg-gray-900 text-gray-500">
                                New to FlagShip?
                            </span>
                        </div>
                    </div>

                    <a
                        href="/signup"
                        class="block w-full text-center px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                    >
                        Create an account
                    </a>
                </div>

                {/* Footer */}
                <p class="text-center mt-8 text-sm text-gray-500">
                    By signing in, you agree to our{' '}
                    <a href="/terms" class="text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
                        Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" class="text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </main>
    )
}
