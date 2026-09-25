import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { patchGeopfSearchEval } from './vite.geopfPlugins'
import { MONOLITHIC_IIFE_CHUNK_LIMIT_KB } from './vite.manualChunks'
import { libCssAssetFileName, libMinifyEsbuildOptions } from './vite/libBuildOptions'

const minify = process.env.LIB_MINIFY === '1'

export default defineConfig({
  plugins: [patchGeopfSearchEval()],
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
      entry: fileURLToPath(new URL('./src/lib/entries/search-engine.ts', import.meta.url)),
      name: 'EntreeCartoSearchEngine',
      formats: ['iife'],
      fileName: () => (minify ? 'entree-carto-search-engine.min.js' : 'entree-carto-search-engine.js'),
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: libCssAssetFileName('entree-carto-search-engine', minify),
        extend: true,
      },
    },
  },
})
