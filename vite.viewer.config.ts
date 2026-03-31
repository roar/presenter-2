import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Viewer-only build — minimal bundle for shared links and live window.
// Must not import anything from src/renderer/.
export default defineConfig({
  root: resolve(__dirname, 'src/viewer'),
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'out/viewer'),
    emptyOutDir: true
  }
})
