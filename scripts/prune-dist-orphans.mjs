#!/usr/bin/env node
/**
 * Retire les chunks Vite obsolètes dans dist/assets/ (emptyOutDir: false sur les builds lib).
 * Supprime notamment les index.es-* (canvg/jsPDF) et workers printExport non référencés.
 */
import { readFileSync, readdirSync, unlinkSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = path.join(root, 'dist')
const assetsDir = path.join(distRoot, 'assets')

function collectReferencedAssetNames(dir) {
  const names = new Set()
  function walk(current) {
  let entries
  try {
    entries = readdirSync(current, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(current, entry.name)
    if (entry.isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.(js|html|css)$/i.test(entry.name)) continue
    let text
    try {
      text = readFileSync(full, 'utf8')
    } catch {
      continue
    }
    for (const match of text.matchAll(/(?:assets\/|\.\/)([A-Za-z0-9_.-]+\.(?:js|css))/g)) {
      names.add(match[1])
    }
    // Worker Vite : new URL("printExport.worker-….js", import.meta.url) sans préfixe assets/
    for (const match of text.matchAll(/printExport\.worker-[A-Za-z0-9_.-]+\.js/g)) {
      names.add(match[0])
    }
  }
  }
  walk(dir)
  return names
}

function main() {
  if (!statSync(distRoot).isDirectory()) {
    console.error('dist/ absent — rien à nettoyer.')
    process.exit(1)
  }
  const referenced = collectReferencedAssetNames(distRoot)
  let removed = 0
  let entries
  try {
    entries = readdirSync(assetsDir)
  } catch {
    console.log('dist/assets/ absent.')
    return
  }
  for (const name of entries) {
    if (!/^index\.es-/.test(name) && !/^printExport\.worker-/.test(name)) continue
    if (referenced.has(name)) continue
    unlinkSync(path.join(assetsDir, name))
    removed += 1
    console.log(`supprimé: dist/assets/${name}`)
  }
  console.log(removed > 0 ? `${removed} artefact(s) obsolète(s) retiré(s).` : 'Aucun artefact obsolète.')
}

main()
