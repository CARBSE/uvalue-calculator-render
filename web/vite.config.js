import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // helps Vite build with correct root
  base: './',
  server: {
    proxy: {
      // for local development only
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',       // ensures build output goes to dist/
    emptyOutDir: true,    // cleans the folder before building
  },
})
