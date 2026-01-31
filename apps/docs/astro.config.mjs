import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightThemeGalaxy from 'starlight-theme-galaxy'
import starlightPageActions from 'starlight-page-actions'

export default defineConfig({
  site: 'https://cloudwerk.dev',
  integrations: [
    starlight({
      plugins: [
        starlightThemeGalaxy(),
        starlightPageActions({
          baseUrl: 'https://cloudwerk.dev/',
        }),
      ],
      title: 'Cloudwerk',
      description: 'Full-stack framework for Cloudflare Workers. File-based routing, D1 database, R2 storage, queues, and auth—all on the edge.',
      logo: {
        src: './src/assets/logo.svg',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/squirrelsoft-dev/cloudwerk' },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://cloudwerk.dev/api/og.png' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:card', content: 'summary_large_image' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://cloudwerk.dev/api/og.png' },
        },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/squirrelsoft-dev/cloudwerk/edit/main/apps/docs/',
      },
    }),
  ],
})
