import { isAuthenticated } from "@cloudwerk/auth"
import { redirect } from "@cloudwerk/core"
import PasskeySignupForm from "@/components/PasskeySignupForm"

export async function loader() {
    // Redirect if already authenticated
    if (isAuthenticated()) {
        return redirect('/dashboard')
    }
    return {}
}

export default function SignupPage() {
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
                        <h1 class="text-2xl font-bold mb-2">Create your account</h1>
                        <p class="text-gray-600 dark:text-gray-400">
                            Start shipping features with confidence
                        </p>
                    </div>

                    <PasskeySignupForm />

                    {/* Info box */}
                    <div class="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <div class="flex gap-3">
                            <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="text-sm text-indigo-700 dark:text-indigo-300">
                                Passkeys use your device's biometrics or PIN for secure, passwordless authentication.
                            </p>
                        </div>
                    </div>

                    <div class="relative my-8">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-4 bg-white dark:bg-gray-900 text-gray-500">
                                Already have an account?
                            </span>
                        </div>
                    </div>

                    <a
                        href="/login"
                        class="block w-full text-center px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                    >
                        Sign in
                    </a>
                </div>

                {/* Footer */}
                <p class="text-center mt-8 text-sm text-gray-500">
                    By creating an account, you agree to our{' '}
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
