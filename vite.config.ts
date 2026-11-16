import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// 상대 경로 base: GitHub Pages의 /저장소이름/ 아래에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '하늘섬 탐험일지',
        short_name: '하늘섬',
        description: '초등 3학년 매일 모험 학습',
        lang: 'ko',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1b2140',
        theme_color: '#1b2140',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json}', 'voice/*.mp3'],
        globIgnores: ['voice-samples/**'],
      },
    }),
  ],
})
