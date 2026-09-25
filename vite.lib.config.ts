import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { libCssAssetFileName, libMinifyEsbuildOptions } from './vite/libBuildOptions'
import { remixiconExternal } from './vite/remixiconExternal'
import { MONOLITHIC_IIFE_CHUNK_LIMIT_KB } from './vite.manualChunks'
import { patchGeopfSearchEval } from './vite.geopfPlugins'

const minify = process.env.LIB_MINIFY === '1'

export default defineConfig({
  plugins: [patchGeopfSearchEval(), remixiconExternal(), vue()],
  esbuild: libMinifyEsbuildOptions(minify),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
  },
  build: {
    chunkSizeWarningLimit: MONOLITHIC_IIFE_CHUNK_LIMIT_KB,
    outDir: 'dist',
    emptyOutDir: false,
    minify,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/lib/index.ts', import.meta.url)),
      name: 'gpu',
      formats: ['iife'],
      fileName: () => (minify ? 'entree-carto.min.js' : 'entree-carto.js'),
    },
    rollupOptions: {
      output: {
        assetFileNames: libCssAssetFileName('entree-carto', minify),
        extend: true,
      },
    },
  },
})
