import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Separate Vite config for the web/website build (no Electron)
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'out/web'),
    emptyOutDir: true
  }
})
