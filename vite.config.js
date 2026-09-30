import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web build (Vercel): the app is served under /train, output to dist/train.
// Mobile build (Capacitor): run with CAP=1 -> base '/', output to ./mobile (Capacitor's webDir).
// The two never collide, and the web deploy is unchanged.
const isCap = process.env.CAP === '1'

export default defineConfig({
  base: isCap ? '/' : '/train/',
  plugins: [react()],
  server: { port: 3000 },
  build: {
    outDir: isCap ? 'mobile' : 'dist/train',
    emptyOutDir: true,
  },
})
