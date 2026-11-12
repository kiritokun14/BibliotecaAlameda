import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React y el enrutador cambian poco: en su propio archivo el navegador los guarda entre versiones
        manualChunks(id: string) {
          if (/node_modules[/\\](react|react-dom|react-router|scheduler)[/\\]/.test(id)) return 'react';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') },
    },
  },
})
