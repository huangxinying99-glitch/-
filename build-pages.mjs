import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = path.resolve('C:/Users/happyelements/Documents/小西嘻/recover/app/frontend');
const outDir = path.resolve('C:/Users/happyelements/Documents/小西嘻/recover/docs');
process.env.VITE_APP_TITLE = 'shadcnui';
process.env.VITE_APP_DESCRIPTION = 'Atoms Generated Project';
process.env.VITE_APP_LOGO_URL = 'https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico';
const viteMod = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
const reactMod = await import(pathToFileURL(path.join(root, 'node_modules/@vitejs/plugin-react-swc/index.js')).href);
const build = viteMod.build;
const react = reactMod.default;

await fs.rm(outDir, { recursive: true, force: true });

await build({
  root,
  configFile: false,
  base: '/-/',
  publicDir: path.join(root, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
});
