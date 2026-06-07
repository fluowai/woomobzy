import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    root: process.cwd(),
    server: {
      port: 3006,
      strictPort: true,
      host: true,
      watch: {
        ignored: ['**/.sessions/**'],
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo-imobfluow.png', 'logo-imobfluow.svg', 'icons/imobfluow-*.png'],
        manifest: {
          id: '/',
          name: 'IMOBFLUOW - Gestão Imobiliária Inteligente',
          short_name: 'IMOBFLUOW',
          description: 'Sistema de gestão imobiliária completo para mercado rural e urbano.',
          theme_color: '#16a34a',
          background_color: '#f8fafc',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'portrait-primary',
          lang: 'pt-BR',
          dir: 'ltr',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/imobfluow-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icons/imobfluow-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          categories: ['business', 'productivity', 'real estate'],
          shortcuts: [
            {
              name: 'Painel IMOBFLUOW',
              short_name: 'Painel',
              description: 'Abrir o painel do sistema',
              url: '/login',
              icons: [{ src: '/icons/imobfluow-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Agendar demonstração',
              short_name: 'Demo',
              description: 'Solicitar uma demonstração da plataforma',
              url: '/consultoria',
              icons: [{ src: '/icons/imobfluow-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          globIgnores: ['**/templates/**', '**/images/fazendas-brasil/**', '**/WhatsApp*.jpeg'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/api\.supabase\.(co|com)\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
