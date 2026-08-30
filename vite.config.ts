import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}

export default defineConfig({
  base: '/RubikCube/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/icon-180.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Rubik Cube',
        short_name: 'RubikCube',
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
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    execArgv: ['--no-experimental-webstorage'],
    passWithNoTests: true,
  },
})
