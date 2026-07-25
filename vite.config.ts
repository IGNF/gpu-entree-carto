import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Sous-chemin GitLab Pages (ex. `/entree-carto/`).
 * En local / hors CI → `/`.
 */
function pagesBase(): string {
  const raw = process.env.CI_PAGES_URL
  if (!raw) return '/'
  try {
    let path = new URL(raw).pathname
    if (!path.endsWith('/')) path += '/'
    return path || '/'
  } catch {
    return '/'
  }
}

export default defineConfig({
  base: pagesBase(),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    port: 5173,
    open: false,
  },
})
