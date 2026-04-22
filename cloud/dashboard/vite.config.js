import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'camera-proxy',
      configureServer(server) {
        server.middlewares.use('/cam-proxy', async (req, res) => {
          const qs   = new URL(req.url, 'http://localhost').searchParams;
          const base = qs.get('url');
          if (!base) { res.statusCode = 400; return res.end('missing url'); }
          try {
            const upstream = await fetch(`${base}/shot.jpg`, {
              headers: { Authorization: 'Basic ' + Buffer.from('6prakriti:Tiger').toString('base64') },
            });
            if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
            const buffer   = Buffer.from(await upstream.arrayBuffer());
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(buffer);
          } catch (e) {
            process.stdout.write(`[cam-proxy] error: ${e.message}\n`);
            res.statusCode = 503;
            res.end('camera unreachable');
          }
        });
      },
    },
  ],
})
