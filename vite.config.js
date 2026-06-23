import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is served under /train (the marketing site owns the root).
// base + outDir put every app file under /train so nothing collides with the site.
export default defineConfig({
  base: '/train/',
  plugins: [react()],
  server: { port: 3000 },
  build: { outDir: 'dist/train', emptyOutDir: true }
})