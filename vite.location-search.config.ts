import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { MONOLITHIC_IIFE_CHUNK_LIMIT_KB } from './vite.manualChunks'
import { libCssAssetFileName, libMinifyEsbuildOptions } from './vite/libBuildOptions'

const minify = process.env.LIB_MINIFY === '1'

export default defineConfig({
  plugins: [vue()],
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
      entry: fileURLToPath(new URL('./src/lib/entries/location-search.ts', import.meta.url)),
      name: 'EntreeCartoLocationSearch',
      formats: ['iife'],
      fileName: () =>
        minify ? 'entree-carto-location-search.min.js' : 'entree-carto-location-search.js',
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: libCssAssetFileName('entree-carto-location-search', minify),
        extend: true,
      },
    },
  },
})
