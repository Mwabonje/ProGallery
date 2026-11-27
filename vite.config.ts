import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            maximumFileSizeToCacheInBytes: 5000000,
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//, /\/sitemap\.xml$/, /\/robots\.txt$/, /\.xml$/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/wsrv\.nl\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'optimized-webp-images',
                  expiration: {
                    maxEntries: 600,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.r2\.dev\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'r2-gallery-media',
                  expiration: {
                    maxEntries: 500,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/images\.mwabonje\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gallery-images',
                  expiration: {
                    maxEntries: 500,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'supabase-images',
                  expiration: {
                    maxEntries: 500,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 // 1 day
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          manifest: false
        })
      ],
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
                return 'vendor-react';
              }
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'vendor-editor';
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }
              if (id.includes('@aws-sdk') || id.includes('@smithy')) {
                return 'vendor-aws';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('jszip')) {
                return 'vendor-zip';
              }
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom']
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async']
      }
    };
});
