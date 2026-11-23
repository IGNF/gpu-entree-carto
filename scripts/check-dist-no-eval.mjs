#!/usr/bin/env node
/**
 * Vérifie qu’aucun bundle JS de dist/ ne contient d’appel eval( (ex. patch geopf Search.js inopérant).
 * Usage : node scripts/check-dist-no-eval.mjs [dossier]   (défaut : dist)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.argv[2] ?? 'dist'
const EVAL_CALL = /(^|[^\w$.])eval\s*\(/g

function* jsFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* jsFiles(p)
    else if (/\.(m?js|cjs)$/.test(name)) yield p
  }
}

let files = 0
const hits = []
try {
  for (const file of jsFiles(root)) {
    files++
    const code = readFileSync(file, 'utf8')
    for (const m of code.matchAll(EVAL_CALL)) {
      const at = m.index + m[1].length
      hits.push(
        `${relative(process.cwd(), file)}:${at} … ${code.slice(at, at + 60).replace(/\s+/g, ' ')}`,
      )
    }
  }
} catch (err) {
  console.error(`[check-dist-no-eval] lecture impossible de ${root} : ${err.message}`)
  process.exit(2)
}

if (hits.length) {
  console.error(`[check-dist-no-eval] ${hits.length} appel(s) eval( trouvé(s) :`)
  for (const h of hits) console.error(`  ${h}`)
  process.exit(1)
}
console.log(`[check-dist-no-eval] OK — ${files} fichier(s) JS sans eval(`)
