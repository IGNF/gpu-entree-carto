import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const minify = process.env.LIB_MINIFY === '1'

/**
 * Bundle standalone : entree-carto-geometry-editor[.min].js + css/
 * OpenLayers inclus (contrairement à ol-geometry-editor historique).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/geometry-editor/index.ts', import.meta.url)),
      name: 'EntreeCartoGeometryEditor',
      formats: ['iife'],
      fileName: () =>
        minify
          ? 'entree-carto-geometry-editor.min.js'
          : 'entree-carto-geometry-editor.js',
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return minify
              ? 'css/entree-carto-geometry-editor.min.css'
              : 'css/entree-carto-geometry-editor.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
