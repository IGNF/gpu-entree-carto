#!/usr/bin/env node
/**
 * Worker d’export carte pour le bundle lib (IIFE) : fichier fixe sous dist/assets/
 * (Vite lib inline sinon le worker en data: URL).
 */
import * as esbuild from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const entry = path.join(root, 'src/lib/map/print/printExport.worker.ts')
const outfile = path.join(root, 'dist/assets/printExport.worker-embed.js')

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile,
  minify: true,
  sourcemap: false,
  alias: {
    '@': path.join(root, 'src'),
  },
  logLevel: 'info',
})
