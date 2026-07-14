import { fileURLToPath } from 'url';
import path from 'path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  base: './',
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
