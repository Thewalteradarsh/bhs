import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/result': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            try {
              const url = new URL(req.url, 'http://localhost');
              const query = url.searchParams.get('query');
              const n = url.searchParams.get('n') || '30';
              proxyReq.path = `/api.php?__call=search.getResults&q=${encodeURIComponent(query)}&n=${n}&p=1&_format=json&_marker=0`;
            } catch (err) {
              console.error('[Vite Proxy] failed to rewrite /result path:', err.message);
            }
          });
        },
      },
      // During local dev, forward /api/* to the Cloudflare Pages / Wrangler
      // local server so Cloudflare Functions (functions/api/*.js) are available.
      // To enable: run `npx wrangler pages dev ./dist --port 8788` alongside `npm run dev`
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        // If wrangler isn't running, proxy errors are silently ignored so the
        // frontend fallback path in fetchSpotifyTracklist still works.
        configure: (proxy) => {
          proxy.on('error', () => { /* wrangler not running — frontend will fall back */ });
        },
      },
    },
  },
})
