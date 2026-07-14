import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const customLevelsPath = path.resolve(rootDir, 'src/customLevels.ts');

function formatLevelRows(rows) {
  return '[\n' + rows.map(row => `    ${JSON.stringify(row)},`).join('\n') + '\n  ]';
}

function saveLevelPlugin() {
  return {
    name: 'xiaoxixi-save-level',
    configureServer(server) {
      server.middlewares.use('/api/save-level', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 2_000_000) req.destroy();
        });

        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const levelIndex = Number(payload.levelIndex);
            const rows = payload.rows;

            if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex > 9) {
              throw new Error('invalid levelIndex');
            }
            if (!Array.isArray(rows) || rows.length === 0 || rows.some(row => typeof row !== 'string')) {
              throw new Error('invalid rows');
            }

            const current = fs.readFileSync(customLevelsPath, 'utf8');
            const declaration = current
              .replace(/export\s+default\s+customLevels\s*;?/, '')
              .replace(/const\s+customLevels\s*:\s*\(string\[\]\s*\|\s*null\)\[\]\s*=/, 'const customLevels =');
            const existing = Function(`${declaration}; return customLevels;`)();
            while (existing.length < 10) existing.push(null);
            existing[levelIndex] = rows;

            const next = `const customLevels: (string[] | null)[] = [\n${existing
              .slice(0, 10)
              .map(level => (level ? `  ${formatLevelRows(level)},` : '  null,'))
              .join('\n')}\n];\n\nexport default customLevels;\n`;

            fs.writeFileSync(customLevelsPath, next, 'utf8');
            server.watcher.add(customLevelsPath);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
          }
        });
      });
    },
  };
}

export default {
  base: './',
  plugins: [saveLevelPlugin()],
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
    watch: { usePolling: true, interval: 600 },
  },
};