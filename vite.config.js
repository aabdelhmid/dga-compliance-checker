import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      // Keep empty or remove if not needed
    },
  },
  plugins: [
    react(),
    {
      name: 'local-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req, res, next) => {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const targetUrl = url.searchParams.get('url');

            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url parameter');
              return;
            }

            console.log(`Proxying request to: ${targetUrl}`);
            const response = await fetch(targetUrl);
            const text = await response.text();

            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html');
            res.statusCode = response.status;
            res.end(text);
          } catch (error) {
            console.error('Proxy error:', error);
            res.statusCode = 500;
            res.end(`Proxy error: ${error.message}`);
          }
        });
      },
    },
  ],
})
