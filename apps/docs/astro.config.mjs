import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightThemeGalaxy from 'starlight-theme-galaxy'
import starlightPageActions from 'starlight-page-actions'
import starlightLlmsTxt from 'starlight-llms-txt'

export default defineConfig({
  site: 'https://cloudwerk.dev',
  integrations: [
    starlight({
      plugins: [
        starlightThemeGalaxy(),
        starlightPageActions(),
        starlightLlmsTxt({
            projectName: 'cloudwerk',
            description: 'Cloudwerk is a full-stack framework for Cloudflare Workers',
            customSets: [
                {
                    label: 'Getting Started',
                    description: 'Learn the basics of Cloudwerk and how to get started quickly.',
                    paths: '["/getting-started/**"]',
                },
                {
                    label: 'Guides',
                    description: 'In-depth guides to help you master Cloudwerk features and functionalities.',
                    paths: '["/guides/**"]',
                },
                {
                    label: 'API Reference',
                    description: 'Reference documentation for Cloudwerk APIs.',
                    paths: '["/api/**"]',
                },
                {
                    label: 'Examples',
                    description: 'In-depth examples to help you master Cloudwerk features and functionalities.',
                    paths: '["/examples/**"]',
                },
                {
                    label: 'Guides',
                    description: 'In-depth guides to help you master Cloudwerk features and functionalities.',
                    paths: '["/guides/**"]',
                },
                {
                    label: 'Other Reference',
                    description: 'In-depth reference documentation for Cloudwerk files',
                    paths: '["/reference/**"]',
                }
            ],
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
          label: 'Examples',
          autogenerate: { directory: 'examples' },
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
