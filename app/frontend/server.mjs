import http from 'node:http';
import fs from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const siteDir = path.join(rootDir, 'docs');
const customLevelsPath = path.join(rootDir, 'src', 'customLevels.ts');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const buildCommand = process.platform === 'win32'
  ? { command: 'cmd.exe', args: ['/c', path.join(rootDir, 'node_modules', '.bin', 'vite.cmd'), 'build'] }
  : { command: path.join(rootDir, 'node_modules', '.bin', 'vite'), args: ['build'] };

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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) {
        reject(new Error('payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function formatLevelRows(rows) {
  return '[\n' + rows.map((row) => `    ${JSON.stringify(row)},`).join('\n') + '\n  ]';
}

function readCustomLevels() {
  const current = fs.readFileSync(customLevelsPath, 'utf8');
  const declaration = current
    .replace(/export\s+default\s+customLevels\s*;?/, '')
    .replace(/const\s+customLevels\s*:\s*\(string\[\]\s*\|\s*null\)\[\]\s*=/, 'const customLevels =');
  const levels = Function(`${declaration}; return customLevels;`)();
  while (levels.length < 10) levels.push(null);
  return levels;
}

function writeCustomLevels(levels) {
  const next = `const customLevels: (string[] | null)[] = [\n${levels.slice(0, 10)
    .map((level) => (level ? `  ${formatLevelRows(level)},` : '  null,'))
    .join('\n')}\n];\n\nexport default customLevels;\n`;
  fs.writeFileSync(customLevelsPath, next, 'utf8');
}

function validateLevel(levelIndex, rows) {
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex > 9) {
    throw new Error('invalid levelIndex');
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.some((row) => typeof row !== 'string')) {
    throw new Error('invalid rows');
  }
}

let buildRunning = null;
async function rebuildFrontend() {
  if (buildRunning) return buildRunning;
  buildRunning = new Promise((resolve, reject) => {
    const result = spawnSync(buildCommand.command, buildCommand.args, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if (result.status === 0) {
      resolve();
      return;
    }
    reject(new Error((result.stderr || result.stdout || 'build failed').toString()));
  }).finally(() => {
    buildRunning = null;
  });
  return buildRunning;
}

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/save-level') {
    const payload = JSON.parse((await readBody(req)) || '{}');
    const levelIndex = Number(payload.levelIndex);
    validateLevel(levelIndex, payload.rows);
    const levels = readCustomLevels();
    levels[levelIndex] = payload.rows;
    writeCustomLevels(levels);
    await rebuildFrontend();
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/save-levels') {
    const payload = JSON.parse((await readBody(req)) || '{}');
    if (!Array.isArray(payload.levels)) throw new Error('invalid levels');
    const levels = readCustomLevels();
    for (const item of payload.levels) {
      const levelIndex = Number(item.levelIndex);
      validateLevel(levelIndex, item.rows);
      levels[levelIndex] = item.rows;
    }
    writeCustomLevels(levels);
    await rebuildFrontend();
    sendJson(res, 200, { ok: true, count: payload.levels.length });
    return true;
  }

  return false;
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
    if (await handleApi(req, res)) {
      return;
    }

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
    sendJson(res, 500, { ok: false, error: String(error?.message || error) });
  }
});

server.listen(port, host, () => {
  console.log(`Game server running at http://${host}:${port}/`);
});
