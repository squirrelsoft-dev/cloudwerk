export default function HomePage() {
  return (
    <>
      {/* Navigation */}
      <nav class="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
              <span class="text-xl font-bold">FlagShip</span>
            </div>
            <div class="hidden md:flex items-center gap-8">
              <a href="#features" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Features</a>
              <a href="#pricing" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Pricing</a>
              <a href="#docs" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Docs</a>
            </div>
            <div class="flex items-center gap-4">
              <a href="/login" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Sign in</a>
              <a href="/signup" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 mb-6 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Now with Edge Runtime support
          </div>
          <h1 class="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Ship features with
            <span class="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent"> confidence</span>
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Feature flags that scale. Control rollouts, run experiments, and ship faster with real-time flag evaluation at the edge.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" class="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Start for free
            </a>
            <a href="#demo" class="px-8 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
              View demo
            </a>
          </div>
        </div>
      </section>

      {/* Code Preview */}
      <section class="pb-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto">
          <div class="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
            <div class="flex items-center gap-2 px-4 py-3 bg-gray-800">
              <div class="w-3 h-3 rounded-full bg-red-500" />
              <div class="w-3 h-3 rounded-full bg-yellow-500" />
              <div class="w-3 h-3 rounded-full bg-green-500" />
              <span class="ml-4 text-sm text-gray-400">app.ts</span>
            </div>
            <pre class="p-6 text-sm overflow-x-auto">
              <code class="text-gray-300">
{`import { FlagShip } from '@flagship/sdk'

const flags = new FlagShip('your-api-key')

// Check if feature is enabled
if (await flags.isEnabled('new-checkout')) {
  renderNewCheckout()
} else {
  renderLegacyCheckout()
}

// Get flag value with targeting
const variant = await flags.getValue('pricing-test', {
  userId: user.id,
  plan: user.plan
})`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-bold mb-4">Everything you need to ship faster</h2>
            <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Built for modern teams who want to move fast without breaking things.
            </p>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-3">Edge Evaluation</h3>
              <p class="text-gray-600 dark:text-gray-400">
                Flags evaluated at the edge with sub-millisecond latency. No cold starts, no waiting.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-3">Gradual Rollouts</h3>
              <p class="text-gray-600 dark:text-gray-400">
                Roll out to 1% of users, then 10%, then everyone. Automatic rollback on errors.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-3">A/B Testing</h3>
              <p class="text-gray-600 dark:text-gray-400">
                Run experiments with statistical significance. Integrate with your analytics stack.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-3">User Targeting</h3>
              <p class="text-gray-600 dark:text-gray-400">
                Target by user attributes, segments, or custom rules. Enable features for specific users instantly.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-3">SDK Support</h3>
              <p class="text-gray-600 dark:text-gray-400">
                First-class SDKs for JavaScript, React, Node.js, Python, Go, and more.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <div class="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold mb-3">Webhooks & Audit</h3>
              <p class="text-gray-600 dark:text-gray-400">
                Get notified on flag changes. Full audit log of who changed what and when.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section class="py-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
          <div class="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div class="text-4xl font-bold text-indigo-600 mb-2">50B+</div>
              <div class="text-gray-600 dark:text-gray-400">Flag evaluations/month</div>
            </div>
            <div>
              <div class="text-4xl font-bold text-indigo-600 mb-2">&lt;1ms</div>
              <div class="text-gray-600 dark:text-gray-400">Average latency</div>
            </div>
            <div>
              <div class="text-4xl font-bold text-indigo-600 mb-2">99.99%</div>
              <div class="text-gray-600 dark:text-gray-400">Uptime SLA</div>
            </div>
            <div>
              <div class="text-4xl font-bold text-indigo-600 mb-2">200+</div>
              <div class="text-gray-600 dark:text-gray-400">Edge locations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div class="max-w-7xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <h3 class="text-lg font-semibold mb-2">Starter</h3>
              <div class="text-4xl font-bold mb-4">Free</div>
              <p class="text-gray-600 dark:text-gray-400 mb-6">For small teams getting started</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Up to 5 flags
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  1M evaluations/month
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  3 team members
                </li>
              </ul>
              <a href="/signup" class="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Get started
              </a>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm ring-2 ring-indigo-600 relative">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-sm rounded-full">
                Popular
              </div>
              <h3 class="text-lg font-semibold mb-2">Pro</h3>
              <div class="text-4xl font-bold mb-4">$49<span class="text-lg font-normal text-gray-600 dark:text-gray-400">/mo</span></div>
              <p class="text-gray-600 dark:text-gray-400 mb-6">For growing teams</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited flags
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  50M evaluations/month
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  10 team members
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  A/B testing
                </li>
              </ul>
              <a href="/signup?plan=pro" class="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Get started
              </a>
            </div>
            <div class="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm">
              <h3 class="text-lg font-semibold mb-2">Enterprise</h3>
              <div class="text-4xl font-bold mb-4">Custom</div>
              <p class="text-gray-600 dark:text-gray-400 mb-6">For large organizations</p>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited everything
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  SSO & SAML
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  99.99% SLA
                </li>
                <li class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Dedicated support
                </li>
              </ul>
              <a href="/contact" class="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Contact sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-3xl font-bold mb-4">Ready to ship faster?</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of teams using FlagShip to release with confidence.
          </p>
          <a href="/signup" class="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Start for free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer class="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div class="max-w-7xl mx-auto">
          <div class="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
                <span class="text-xl font-bold">FlagShip</span>
              </div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">
                Feature flags that scale with your business.
              </p>
            </div>
            <div>
              <h4 class="font-semibold mb-4">Product</h4>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#features" class="hover:text-gray-900 dark:hover:text-white">Features</a></li>
                <li><a href="#pricing" class="hover:text-gray-900 dark:hover:text-white">Pricing</a></li>
                <li><a href="/changelog" class="hover:text-gray-900 dark:hover:text-white">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-4">Resources</h4>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="/docs" class="hover:text-gray-900 dark:hover:text-white">Documentation</a></li>
                <li><a href="/blog" class="hover:text-gray-900 dark:hover:text-white">Blog</a></li>
                <li><a href="/status" class="hover:text-gray-900 dark:hover:text-white">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-4">Company</h4>
              <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="/about" class="hover:text-gray-900 dark:hover:text-white">About</a></li>
                <li><a href="/careers" class="hover:text-gray-900 dark:hover:text-white">Careers</a></li>
                <li><a href="/contact" class="hover:text-gray-900 dark:hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div class="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>&copy; 2025 FlagShip. All rights reserved.</div>
            <div class="flex gap-6">
              <a href="/privacy" class="hover:text-gray-900 dark:hover:text-white">Privacy</a>
              <a href="/terms" class="hover:text-gray-900 dark:hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
