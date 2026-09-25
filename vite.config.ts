import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { demoManualChunks } from './vite.manualChunks'
import { patchDemoConfigForPages, serveDistLibAssets } from './vite.demoPlugins'
import { patchGeopfSearchEval } from './vite.geopfPlugins'

/**
 * GitHub Pages (CI) : `/nom-du-repo/`.
 * Build local (`make build`) : `base: './'` pour `vite preview` (pas d’ouverture `file://` sur dist).
 */
function pagesBase(): string {
  const ghRepo = process.env.GITHUB_REPOSITORY
  if (!ghRepo) return './'
  const repoName = ghRepo.split('/')[1]
  return repoName ? `/${repoName}/` : './'
}

export default defineConfig({
  base: pagesBase(),
  plugins: [patchGeopfSearchEval(), serveDistLibAssets(), patchDemoConfigForPages(), vue()],
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
    proxy: {
      /** gpu-site local (légendes, script config, APIs) — évite ORB en dev. */
      '/__gpu_dev_proxy__': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__gpu_dev_proxy__/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: demoManualChunks,
      },
    },
  },
})
