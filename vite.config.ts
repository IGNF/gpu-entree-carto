import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { demoManualChunks } from './vite.manualChunks'
import { patchDemoConfigForPages, serveDistLibAssets } from './vite.demoPlugins'
import { patchGeopfPanelManager, patchGeopfSearchEval } from './vite.geopfPlugins'
import { vitePrintWorkerBuildOptions } from './vite/libBuildOptions'

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
  ...vitePrintWorkerBuildOptions,
  base: pagesBase(),
  plugins: [
    patchGeopfSearchEval(),
    patchGeopfPanelManager(),
    serveDistLibAssets(),
    patchDemoConfigForPages(),
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'eslint/**/*.spec.mjs'],
  },
  server: {
    port: 5173,
    open: false,
    /** Évite ENOSPC (inotify) : bases CodeQL, dist rebuild, etc. */
    watch: {
      ignored: [
        '**/.codeql-db/**',
        '**/.codeql-db-test/**',
        '**/.codeql-cli/**',
        '**/dist/**',
        '**/.git/**',
      ],
    },
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
