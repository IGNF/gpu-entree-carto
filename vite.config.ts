import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Sous-chemin GitHub Pages (ex. `/entree-carto/`).
 * En local / hors CI → `/`.
 */
function pagesBase(): string {
  const ghRepo = process.env.GITHUB_REPOSITORY
  if (!ghRepo) return '/'
  const repoName = ghRepo.split('/')[1]
  return repoName ? `/${repoName}/` : '/'
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
