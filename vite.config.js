import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Web build (Vercel): the app is served under /train, output to dist/train.
// Mobile build (Capacitor): run with CAP=1 -> base '/', output to ./mobile (Capacitor's webDir).
// The two never collide, and the web deploy is unchanged.
const isCap = process.env.CAP === '1'
const outDir = isCap ? 'mobile' : 'dist/train'

// Every build gets a unique id. It is baked into the app, written to version.json,
// and stamped into sw.js so installed PWAs can tell a new deploy exists.
const BUILD_ID = Date.now().toString(36)

function buildStamp() {
  return {
    name: 'ff-build-stamp',
    apply: 'build',
    closeBundle() {
      const dir = resolve(process.cwd(), outDir)
      writeFileSync(resolve(dir, 'version.json'), JSON.stringify({ id: BUILD_ID }))
      const sw = resolve(dir, 'sw.js')
      if (existsSync(sw)) writeFileSync(sw, readFileSync(sw, 'utf8').replace(/__BUILD_ID__/g, BUILD_ID))
    },
  }
}

export default defineConfig({
  base: isCap ? '/' : '/train/',
  plugins: [react(), buildStamp()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 3000 },
  build: {
    outDir,
    emptyOutDir: true,
  },
})
