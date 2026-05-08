import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Served at https://<user>.github.io/ttn-list/ on GitHub Pages.
// Vite uses this as the base for asset URLs and as `import.meta.env.BASE_URL`,
// which the router reads below to prefix all routes.
const BASE = '/ttn-list/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'TTN List',
        short_name: 'TTN List',
        description:
          'Local-first lists for shopping, chores, and projects. Build saved lists, run them with checkboxes, attach photos, keep a history.',
        theme_color: '#0a0a0a',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'any',
        start_url: BASE,
        scope: BASE,
        icons: [
          {
            src: `${BASE}icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `${BASE}icon-maskable.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
});
