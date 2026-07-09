import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
function levelWriterPlugin() {
  const customLevelsPath = path.resolve(rootDir, './src/customLevels.ts');

  function writeJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  }

  function normalizeRows(rows) {
    if (!Array.isArray(rows)) return null;
    const normalized = rows.map(row => String(row ?? ''));
    return normalized.length > 0 ? normalized : null;
  }

  function toSource(levels) {
    return `const customLevels: (string[] | null)[] = ${JSON.stringify(levels, null, 2)};\n\nexport default customLevels;\n`;
  }

  return {
    name: 'xiaoxixi-level-writer',
    configureServer(server) {
      server.middlewares.use('/api/save-level', (req, res) => {
        if (req.method !== 'POST') {
          writeJson(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 1024 * 1024) req.destroy();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const levelIndex = Number(payload.levelIndex);
            const rows = normalizeRows(payload.rows);
            if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex > 9 || !rows) {
              writeJson(res, 400, { ok: false, error: 'Invalid level payload' });
              return;
            }

            let levels = Array(10).fill(null);
            if (fs.existsSync(customLevelsPath)) {
              const existing = fs.readFileSync(customLevelsPath, 'utf8');
              const match = existing.match(/=\s*([\s\S]*?);\s*\n\s*export default/);
              if (match) levels = JSON.parse(match[1]);
            }
            while (levels.length < 10) levels.push(null);
            levels[levelIndex] = rows;
            fs.writeFileSync(customLevelsPath, toSource(levels), 'utf8');
            server.ws.send({ type: 'full-reload' });
            writeJson(res, 200, { ok: true, levelIndex, rows: rows.length });
          } catch (error) {
            writeJson(res, 500, { ok: false, error: String(error?.message || error) });
          }
        });
      });
    },
  };
}

export default {
  base: './',
  plugins: [levelWriterPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '3000'),
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    watch: { usePolling: true, interval: 600 },
  },
};


