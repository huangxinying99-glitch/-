import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const siteDir = path.join(rootDir, 'docs');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '').replace(/^-\//, '');
  const candidates = [];

  if (cleanPath === '' || cleanPath === 'index.html') {
    candidates.push(path.join(siteDir, 'index.html'));
  } else {
    candidates.push(path.join(siteDir, cleanPath));
    candidates.push(path.join(rootDir, cleanPath));
    if (cleanPath.startsWith('assets/')) {
      candidates.push(path.join(siteDir, cleanPath));
    }
  }

  return candidates.find((filePath) => filePath.startsWith(siteDir) || filePath.startsWith(rootDir));
}

async function readExisting(filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    return await readFile(filePath);
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    let pathname = requestUrl.pathname;

    if (pathname === '/') pathname = '/index.html';
    let filePath = path.join(siteDir, pathname.replace(/^\/+/, '').replace(/^-\//, ''));
    let data = await readExisting(filePath);

    if (!data && pathname === '/index.html') {
      filePath = path.join(rootDir, 'index.html');
      data = await readExisting(filePath);
    }

    if (!data) {
      filePath = path.join(siteDir, 'index.html');
      data = await readExisting(filePath);
    }

    if (!data) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes.get(ext) || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Server error: ${error?.message || error}`);
  }
});

server.listen(port, host, () => {
  console.log(`Game server running at http://${host}:${port}/`);
});



