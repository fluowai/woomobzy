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
        '/whatsapp-api': {
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
          secure: false,
          rewrite: (requestPath) =>
            requestPath.replace(/^\/whatsapp-api/, '/api/whatsapp'),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: [
          'logo-wootech-imob.svg',
          'icons/icon-192x192.png',
          'icons/icon-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'WooTech Imob',
          short_name: 'Imob',
          description:
            'CRM imobiliario do ecossistema WooTech para operacao, captacao e crescimento.',
          theme_color: '#16a34a',
          background_color: '#f8fafc',
          display: 'standalone',
          display_override: [
            'window-controls-overlay',
            'standalone',
            'minimal-ui',
          ],
          orientation: 'portrait-primary',
          lang: 'pt-BR',
          dir: 'ltr',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          categories: ['business', 'productivity', 'real estate'],
          shortcuts: [
            {
              name: 'Painel WooTech Imob',
              short_name: 'Painel',
              description: 'Abrir o painel do sistema',
              url: '/login',
              icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Agendar demonstracao',
              short_name: 'Demo',
              description: 'Solicitar uma demonstracao da plataforma',
              url: '/consultoria',
              icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          globIgnores: [
            '**/templates/**',
            '**/images/fazendas-brasil/**',
            '**/WhatsApp*.jpeg',
          ],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
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
      alias: [
        { find: '@', replacement: path.resolve(process.cwd(), '.') },
        {
          find: /^leaflet-draw$/,
          replacement: path.resolve(
            process.cwd(),
            'src/shims/leaflet-draw-default.ts'
          ),
        },
      ],
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            maps: ['leaflet', 'react-leaflet', 'react-leaflet-draw'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
