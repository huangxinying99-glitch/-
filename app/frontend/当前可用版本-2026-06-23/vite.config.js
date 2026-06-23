export default {
  resolve: {
    alias: {
      '@': `${process.cwd()}/src`,
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '3000'),
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    watch: { usePolling: true, interval: 600 },
  },
};
