import type { APIRoute } from 'astro'
import satori from 'satori'
import { html } from 'satori-html'
import { Resvg } from '@resvg/resvg-js'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const title = url.searchParams.get('title') || 'Cloudwerk'
  const subtitle = url.searchParams.get('subtitle') || 'Full-stack framework for Cloudflare Workers'

  // Fetch Inter font
  const fontData = await fetch(
    'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
  ).then((res) => res.arrayBuffer())

  const fontDataBold = await fetch(
    'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff'
  ).then((res) => res.arrayBuffer())

  const markup = html`
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #1e1e2e 0%, #0c0a1d 100%); padding: 60px;">
      <div style="display: flex; flex-direction: column; flex: 1; justify-content: center;">
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
          <div style="display: flex; width: 64px; height: 64px; background: linear-gradient(135deg, #a855f7, #7c3aed); border-radius: 16px; align-items: center; justify-content: center; margin-right: 20px;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <span style="font-size: 32px; font-weight: 600; color: #6c7086;">cloudwerk.dev</span>
        </div>
        <h1 style="font-size: 72px; font-weight: 700; color: white; margin: 0 0 24px 0; line-height: 1.1;">${title}</h1>
        <p style="font-size: 32px; color: #a6adc8; margin: 0; line-height: 1.4;">${subtitle}</p>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 12px;">
          <span style="display: flex; padding: 8px 16px; background: rgba(168, 85, 247, 0.2); border-radius: 9999px; font-size: 18px; color: #c084fc;">Routes</span>
          <span style="display: flex; padding: 8px 16px; background: rgba(168, 85, 247, 0.2); border-radius: 9999px; font-size: 18px; color: #c084fc;">D1</span>
          <span style="display: flex; padding: 8px 16px; background: rgba(168, 85, 247, 0.2); border-radius: 9999px; font-size: 18px; color: #c084fc;">R2</span>
          <span style="display: flex; padding: 8px 16px; background: rgba(168, 85, 247, 0.2); border-radius: 9999px; font-size: 18px; color: #c084fc;">Queues</span>
          <span style="display: flex; padding: 8px 16px; background: rgba(168, 85, 247, 0.2); border-radius: 9999px; font-size: 18px; color: #c084fc;">Auth</span>
        </div>
      </div>
    </div>
  `

  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: fontDataBold,
        weight: 700,
        style: 'normal',
      },
    ],
  })

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  })

  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  return new Response(Buffer.from(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
