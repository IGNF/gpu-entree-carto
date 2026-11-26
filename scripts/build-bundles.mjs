#!/usr/bin/env node
/**
 * Build des bundles IIFE (configs vite/<nom>.config.ts), chacun en version normale puis minifiée.
 *
 *   node scripts/build-bundles.mjs            # tous
 *   node scripts/build-bundles.mjs lib sketch # sélection
 *
 * Après `lib` : worker d’export carte (esbuild). À la fin : purge des chunks orphelins de dist/assets/.
 */
import { build } from 'vite'

const ALL = ['lib', 'location-search', 'search-engine', 'geometry-editor', 'sketch']

const requested = process.argv.slice(2)
const unknown = requested.filter((name) => !ALL.includes(name))
if (unknown.length) {
  console.error(`Bundle(s) inconnu(s) : ${unknown.join(', ')} (attendu : ${ALL.join(', ')})`)
  process.exit(1)
}
const bundles = requested.length ? requested : ALL

for (const name of bundles) {
  for (const minify of ['0', '1']) {
    process.env.LIB_MINIFY = minify
    await build({ configFile: `vite/${name}.config.ts` })
  }
  if (name === 'lib') await import('./build-print-export-worker.mjs')
}

await import('./prune-dist-orphans.mjs')
