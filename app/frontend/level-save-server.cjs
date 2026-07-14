const http = require('http');
const fs = require('fs');
const path = require('path');
const customLevelsPath = path.resolve(__dirname, 'src/customLevels.ts');
function formatLevelRows(rows) { return '[\n' + rows.map(row => `    ${JSON.stringify(row)},`).join('\n') + '\n  ]'; }
function readCustomLevels() { const current = fs.readFileSync(customLevelsPath, 'utf8'); const declaration = current.replace(/export\s+default\s+customLevels\s*;?/, '').replace(/const\s+customLevels\s*:\s*\(string\[\]\s*\|\s*null\)\[\]\s*=/, 'const customLevels ='); const levels = Function(`${declaration}; return customLevels;`)(); while (levels.length < 10) levels.push(null); return levels; }
function writeCustomLevels(levels) { const next = `const customLevels: (string[] | null)[] = [\n${levels.slice(0, 10).map(level => (level ? `  ${formatLevelRows(level)},` : '  null,')).join('\n')}\n];\n\nexport default customLevels;\n`; fs.writeFileSync(customLevelsPath, next, 'utf8'); }
function validateLevel(levelIndex, rows) { if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex > 9) throw new Error('invalid levelIndex'); if (!Array.isArray(rows) || rows.length === 0 || rows.some(row => typeof row !== 'string')) throw new Error('invalid rows'); }
function send(res, code, payload) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(payload)); }
function body(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', chunk => { data += chunk; if (data.length > 5000000) reject(new Error('payload too large')); }); req.on('end', () => resolve(data)); req.on('error', reject); }); }
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  try {
    if (req.method === 'POST' && req.url === '/api/save-level') { const payload = JSON.parse(await body(req) || '{}'); const levelIndex = Number(payload.levelIndex); validateLevel(levelIndex, payload.rows); const levels = readCustomLevels(); levels[levelIndex] = payload.rows; writeCustomLevels(levels); return send(res, 200, { ok: true }); }
    if (req.method === 'POST' && req.url === '/api/save-levels') { const payload = JSON.parse(await body(req) || '{}'); if (!Array.isArray(payload.levels)) throw new Error('invalid levels'); const levels = readCustomLevels(); for (const item of payload.levels) { const levelIndex = Number(item.levelIndex); validateLevel(levelIndex, item.rows); levels[levelIndex] = item.rows; } writeCustomLevels(levels); return send(res, 200, { ok: true, count: payload.levels.length }); }
    send(res, 404, { ok: false, error: 'not found' });
  } catch (error) { send(res, 400, { ok: false, error: String(error && error.message || error) }); }
}).listen(8000, '127.0.0.1', () => console.log('level save server listening on http://127.0.0.1:8000'));