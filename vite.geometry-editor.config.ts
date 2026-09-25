import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { libCssAssetFileName, libMinifyEsbuildOptions } from './vite/libBuildOptions'
import { remixiconExternal } from './vite/remixiconExternal'
import { MONOLITHIC_IIFE_CHUNK_LIMIT_KB } from './vite.manualChunks'

const minify = process.env.LIB_MINIFY === '1'

/**
 * Bundle standalone : entree-carto-geometry-editor[.min].js + css/
 * OpenLayers inclus (contrairement à ol-geometry-editor historique).
 */
export default defineConfig({
  plugins: [remixiconExternal()],
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
      entry: fileURLToPath(new URL('./src/geometry-editor/index.ts', import.meta.url)),
      name: 'EntreeCartoGeometryEditor',
      formats: ['iife'],
      fileName: () =>
        minify ? 'entree-carto-geometry-editor.min.js' : 'entree-carto-geometry-editor.js',
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: libCssAssetFileName('entree-carto-geometry-editor', minify),
      },
    },
  },
})
