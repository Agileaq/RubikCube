import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}

// A SINGLE build stamp captured once at config-eval time. Both __BUILD_TIME__
// (inlined into the bundle) and dist/version.json's builtAt MUST use the same
// value — if they differ, the runtime version poll sees a permanent mismatch
// and the update banner re-appears ~5s after every reload (the
// "banner keeps coming back, no real update" bug). This is the source of truth.
const BUILD_TIME = new Date().toISOString()

// Build-time version stamp written to dist/version.json. Unlike the SW's
// updatefound/waiting events (which iOS standalone PWA never fires reliably),
// this file can be fetched with cache:'no-store' at runtime to detect that a
// new build shipped. The file lives in dist/ (not public/) so it is NOT in the
// SW precache list — a no-store fetch always reaches the network.
function buildStamp() {
  return {
    name: 'write-version-json',
    closeBundle() {
      const stamp = {
        version: process.env.npm_package_version ?? '0.0.0',
        gitSha: process.env.GIT_SHA ?? gitSha(),
        builtAt: BUILD_TIME,
      }
      try { writeFileSync('dist/version.json', JSON.stringify(stamp)) } catch { /* ignore */ }
    },
  }
}

export default defineConfig({
  base: '/RubikCube/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? gitSha()),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/icon-180.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Rubik Cube',
        short_name: 'Cube',
        start_url: '/RubikCube/',
        scope: '/RubikCube/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#4a90d9',
        icons: [
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
    buildStamp(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    execArgv: ['--no-experimental-webstorage'],
    passWithNoTests: true,
  },
})
