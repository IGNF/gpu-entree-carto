#!/usr/bin/env node
/**
 * Copie DSFR + Remix Icon dans public/external/ pour la démo Vite hors gpu-site.
 * gpu-site charge déjà dsfr.min.css + utility ; les bundles dist/ n’embarquent plus icons.min.css.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const externalRoot = path.join(root, 'public/external')

const copies = [
  {
    from: 'node_modules/@gouvfr/dsfr/dist/dsfr.min.css',
    to: 'dsfr/dsfr.min.css',
  },
  {
    from: 'node_modules/@gouvfr/dsfr/dist/dsfr.module.min.js',
    to: 'dsfr/dsfr.module.min.js',
  },
  {
    from: 'node_modules/@gouvfr/dsfr/dist/utility/icons/icons.min.css',
    to: 'dsfr/utility/icons/icons.min.css',
  },
  {
    from: 'node_modules/remixicon/fonts/remixicon.woff2',
    to: 'remixicon/remixicon.woff2',
  },
]

function syncRemixCss() {
  const src = path.join(root, 'node_modules/remixicon/fonts/remixicon.css')
  const dest = path.join(externalRoot, 'remixicon/remixicon.css')
  let css = readFileSync(src, 'utf8')
  css = css.replace(/url\(["']?\.\/remixicon\.woff2["']?\)/g, 'url("./remixicon.woff2")')
  writeFileSync(dest, css)
}

/** Évite les 404 / erreurs DevTools : pas de .map copiés dans public/external. */
function stripSourceMapComment(filePath) {
  let source = readFileSync(filePath, 'utf8')
  const next = source.replace(/\n?\/\/# sourceMappingURL=.*$/m, '').replace(/\n?\/\*# sourceMappingURL=.*?\*\/\s*$/m, '')
  if (next !== source) writeFileSync(filePath, next)
}

mkdirSync(path.join(externalRoot, 'dsfr/utility/icons'), { recursive: true })
mkdirSync(path.join(externalRoot, 'remixicon'), { recursive: true })

for (const { from, to } of copies) {
  const srcPath = path.join(root, from)
  const destPath = path.join(externalRoot, to)
  mkdirSync(path.dirname(destPath), { recursive: true })
  cpSync(srcPath, destPath)
  if (destPath.endsWith('.js')) stripSourceMapComment(destPath)
}

const dsfrDist = path.join(root, 'node_modules/@gouvfr/dsfr/dist')
cpSync(path.join(dsfrDist, 'fonts'), path.join(externalRoot, 'dsfr/fonts'), { recursive: true })
/** Masques SVG référencés par utility/icons/icons.min.css (url ../../icons/…). */
cpSync(path.join(dsfrDist, 'icons'), path.join(externalRoot, 'dsfr/icons'), { recursive: true })

syncRemixCss()
console.log('public/external/ synchronisé (DSFR + Remix Icon).')
