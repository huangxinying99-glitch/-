import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(repoRoot, 'app/frontend/docs');
const outDir = path.join(repoRoot, 'docs');

await fs.access(path.join(sourceDir, 'index.html'));
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });
await fs.cp(sourceDir, outDir, { recursive: true });
console.log(`Copied ${sourceDir} -> ${outDir}`);
