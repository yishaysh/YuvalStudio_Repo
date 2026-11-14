import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function createDevApiPlugin() {
  return {
    name: 'yuval-studio-dev-api',
    configureServer(server: any) {
      let memoryStorePromise: Promise<any> | null = null;

      server.middlewares.use(async (req: any, res: any, next: () => void) => {
        const rawUrl = req.url || '/';
        const urlObj = new URL(rawUrl, 'http://localhost');
        if (!urlObj.pathname.startsWith('/api/')) {
          return next();
        }

        try {
          const [handlerMod, authMod, memMod, neonMod] = await Promise.all([
            server.ssrLoadModule('/api/_lib/handler.ts'),
            server.ssrLoadModule('/api/_lib/auth.ts'),
            server.ssrLoadModule('/api/_lib/memoryStore.ts'),
            server.ssrLoadModule('/api/_lib/neonStore.ts'),
          ]);

          const dbUrl = authMod.resolveDatabaseUrlFromEnv();
          const useMemory = process.env.USE_MEMORY_STORE === '1' || !dbUrl;

          let store;
          if (useMemory) {
            if (!memoryStorePromise) {
              memoryStorePromise = Promise.resolve(new memMod.MemoryStore());
            }
            store = await memoryStorePromise;
          } else {
            store = new neonMod.NeonStore(dbUrl);
          }

          const query: Record<string, string | undefined> = {};
          urlObj.searchParams.forEach((v, k) => {
            query[k] = v;
          });

          const headers: Record<string, string | undefined> = {};
          for (const [k, v] of Object.entries(req.headers || {})) {
            headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : (v as string | undefined);
          }

          let body: any = {};
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            if (chunks.length > 0) {
              try {
                body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              } catch {
                body = {};
              }
            }
          }

          const cookies = authMod.parseCookieHeader(headers.cookie);
          const result = await handlerMod.handleApiRequest(
            {
              method: req.method || 'GET',
              path: urlObj.pathname,
              query,
              headers,
              cookies,
              body,
              isHttps: headers['x-forwarded-proto'] === 'https',
            },
            { store }
          );

          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          if (result.headers) {
            for (const [k, v] of Object.entries(result.headers)) {
              res.setHeader(k, v as string);
            }
          }
          if (result.setCookies && result.setCookies.length > 0) {
            res.setHeader('Set-Cookie', result.setCookies);
          }
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          console.error('[Vite Dev API Middleware Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Dev API error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), createDevApiPlugin()],
  define: {
    // Defense-in-depth: scrub legacy sensitive VITE_* variables so Vite never inlines them into client bundles.
    'import.meta.env.VITE_NEON_DATABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(''),
    'import.meta.env.VITE_CLOUDINARY_API_SECRET': JSON.stringify(''),
    'import.meta.env.VITE_ADMIN_PASSWORD': JSON.stringify(''),
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          lottie: ['lottie-react'],
          'pdf-export': ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
