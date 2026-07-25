import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const minify = process.env.LIB_MINIFY === '1'

/**
 * Bundle standalone : entree-carto-sketch[.min].js + css/
 * OpenLayers inclus.
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
      entry: fileURLToPath(new URL('./src/sketch/index.ts', import.meta.url)),
      name: 'EntreeCartoSketch',
      formats: ['iife'],
      fileName: () =>
        minify ? 'entree-carto-sketch.min.js' : 'entree-carto-sketch.js',
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return minify
              ? 'css/entree-carto-sketch.min.css'
              : 'css/entree-carto-sketch.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
