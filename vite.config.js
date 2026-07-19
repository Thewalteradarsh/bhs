import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Saavn Clone',
        short_name: 'Saavn',
        description: 'Enterprise PWA with Offline Playback',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
             src: '/logo.png',
             sizes: '192x192',
             type: 'image/png'
          },
          {
             src: '/logo.png',
             sizes: '512x512',
             type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Exclude audio caching from workbox, we handle that in idb
        runtimeCaching: [],
        maximumFileSizeToCacheInBytes: 10485760 // 10 MiB
      }
    })
  ],
})
