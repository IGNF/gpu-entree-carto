#!/usr/bin/env node
/**
 * Contrôle des bundles construits dans dist/ :
 * - aucun appel eval( (ex. patch geopf Search.js inopérant) ;
 * - aucun fichier source .ts copié tel quel (servi en video/mp2t, bloqué par le navigateur) ;
 * - aucune ressource inlinée en data:video/mp2t (source TypeScript encodée en base64).
 * Usage : node scripts/check-dist.mjs [dossier]   (défaut : dist)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.argv[2] ?? 'dist'
const EVAL_CALL = /(^|[^\w$.])eval\s*\(/g
const TS_DATA_URL = /data:video\/mp2t[;,]/g

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* files(p)
    else yield p
  }
}

const show = (file) => relative(process.cwd(), file)
let jsCount = 0
const hits = []
try {
  for (const file of files(root)) {
    if (/\.(c|m)?ts$/.test(file) && !file.endsWith('.d.ts')) {
      hits.push(`${show(file)} : fichier source TypeScript non compilé (servi en video/mp2t)`)
      continue
    }
    if (!/\.(m|c)?js$/.test(file)) continue
    jsCount++
    const code = readFileSync(file, 'utf8')
    for (const m of code.matchAll(EVAL_CALL)) {
      const at = m.index + m[1].length
      hits.push(`${show(file)}:${at} : eval( … ${code.slice(at, at + 60).replace(/\s+/g, ' ')}`)
    }
    for (const m of code.matchAll(TS_DATA_URL)) {
      hits.push(`${show(file)}:${m.index} : ressource data:video/mp2t (source .ts inlinée)`)
    }
  }
} catch (err) {
  console.error(`[check-dist] lecture impossible de ${root} : ${err.message}`)
  process.exit(2)
}

if (hits.length) {
  console.error(`[check-dist] ${hits.length} problème(s) :`)
  for (const h of hits) console.error(`  ${h}`)
  process.exit(1)
}
console.log(
  `[check-dist] OK — ${jsCount} fichier(s) JS : ni eval(, ni source .ts, ni data:video/mp2t`,
)
