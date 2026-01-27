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
      logo: {
        src: './src/assets/logo.svg',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/squirrelsoft-dev/cloudwerk' },
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
          label: 'Examples',
          autogenerate: { directory: 'examples' },
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
