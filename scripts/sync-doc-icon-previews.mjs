#!/usr/bin/env node
/**
 * Copy DSFR / Remix / custom SVG previews into doc/img/icon-previews/
 * and refresh the Preview column in doc/icone-references*.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docDir = path.join(root, 'doc')
const previewRoot = path.join(docDir, 'img/icon-previews')
const dsfrIconsRoot = path.join(root, 'node_modules/@gouvfr/dsfr/dist/icons')
const remixIconsRoot = path.join(root, 'node_modules/remixicon/icons')

const CUSTOM_SOURCES = {
  'ri-draw-line': path.join(root, 'src/assets/custom-icons/draw-line.svg'),
  'ec-icon-parcelle': path.join(root, 'src/assets/custom-icons/parcelle.svg'),
}

/** DSFR utility classes without a matching file under dist/icons — preview from Remix (visual proxy). */
const DSFR_PREVIEW_FROM_REMIX = {
  'fr-icon-delete-line': 'delete-bin-line',
  'fr-icon-history-line': 'history-line',
  'fr-icon-subway-line': 'subway-line',
  'fr-icon-plane-line': 'plane-line',
  'fr-icon-parking-box-line': 'parking-box-line',
}

/** @type {Map<string, string>} className → relative path from doc/ */
const previewByClass = new Map()

function walkSvgFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name)
    if (name.isDirectory()) walkSvgFiles(full, acc)
    else if (name.name.endsWith('.svg')) acc.push(full)
  }
  return acc
}

function buildLookup() {
  /** @type {Map<string, string>} */
  const dsfr = new Map()
  for (const file of walkSvgFiles(dsfrIconsRoot)) {
    dsfr.set(path.basename(file, '.svg'), file)
  }
  /** @type {Map<string, string>} */
  const remix = new Map()
  for (const file of walkSvgFiles(remixIconsRoot)) {
    remix.set(path.basename(file, '.svg'), file)
  }
  return { dsfr, remix }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyPreview(className, sourcePath, subdir) {
  const slug = className
    .replace(/^fr-icon-/, '')
    .replace(/^ri-/, '')
    .replace(/^ec-icon-/, '')
  const destDir = path.join(previewRoot, subdir)
  ensureDir(destDir)
  const dest = path.join(destDir, `${slug}.svg`)
  fs.copyFileSync(sourcePath, dest)
  const rel = `./img/icon-previews/${subdir}/${slug}.svg`
  previewByClass.set(className, rel)
  return rel
}

function syncAssets(lookup) {
  if (fs.existsSync(previewRoot)) {
    fs.rmSync(previewRoot, { recursive: true, force: true })
  }
  ensureDir(previewRoot)

  const md = fs.readFileSync(path.join(docDir, 'icone-references.md'), 'utf8')
  const classes = [
    ...new Set([
      ...md.matchAll(/`(fr-icon-[a-z0-9-]+)`/g),
      ...md.matchAll(/`(ri-[a-z0-9-]+)`/g),
      ...md.matchAll(/`(ec-icon-[a-z0-9-]+)`/g),
    ].map((m) => m[1])),
  ]

  const missing = []
  for (const className of classes) {
    if (CUSTOM_SOURCES[className]) {
      copyPreview(className, CUSTOM_SOURCES[className], 'custom')
      continue
    }
    if (className.startsWith('fr-icon-')) {
      const base = className.slice('fr-icon-'.length)
      let src = lookup.dsfr.get(base)
      if (!src && DSFR_PREVIEW_FROM_REMIX[className]) {
        src = lookup.remix.get(DSFR_PREVIEW_FROM_REMIX[className])
      }
      if (src) copyPreview(className, src, 'dsfr')
      else missing.push(className)
      continue
    }
    if (className.startsWith('ri-')) {
      const base = className.slice('ri-'.length)
      const src = lookup.remix.get(base)
      if (src) copyPreview(className, src, 'remix')
      else missing.push(className)
      continue
    }
  }

  if (missing.length) {
    console.warn('No SVG preview for:', missing.join(', '))
  }
}

function previewCell(htmlClassCell) {
  const classes = [
    ...htmlClassCell.matchAll(/`(fr-icon-[a-z0-9-]+|ri-[a-z0-9-]+|ec-icon-[a-z0-9-]+)`/g),
  ].map((m) => m[1])
  if (classes.length === 0) return '—'
  const imgs = classes
    .map((c) => {
      const rel = previewByClass.get(c)
      if (!rel) return null
      return `<img src="${rel}" width="24" height="24" alt="" />`
    })
    .filter(Boolean)
  if (imgs.length === 0) return '—'
  return imgs.join(' ')
}

const TABLE_HEADER =
  /^\| (?:(Preview|Aperçu) \| )?(Label|Libellé) \| (HTML class|Classe HTML) \| (Catalog|Catalogue) \| URL \|$/

function tableMeta(fileName, headerLine) {
  const fr = fileName.includes('.fr.')
  const previewCol = fr ? 'Aperçu' : 'Preview'
  const labelCol = fr ? 'Libellé' : 'Label'
  const classCol = fr ? 'Classe HTML' : 'HTML class'
  const catalogCol = fr ? 'Catalogue' : 'Catalog'
  const sep =
    fr
      ? '| ------- | ------- | ------------ | --------- | --- |'
      : '| ------- | ----- | ---------- | ------- | --- |'
  const fullHeader = `| ${previewCol} | ${labelCol} | ${classCol} | ${catalogCol} | URL |`
  return { previewCol, labelCol, classCol, catalogCol, sep, fullHeader }
}

function refreshPreviewColumn(fileName) {
  const filePath = path.join(docDir, fileName)
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  const out = []
  let inTable = false
  /** @type {ReturnType<typeof tableMeta> | null} */
  let meta = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headerMatch = line.match(TABLE_HEADER)
    if (headerMatch) {
      meta = tableMeta(fileName, line)
      inTable = true
      const hasPreviewCol = Boolean(headerMatch[1])
      out.push(meta.fullHeader)
      if (lines[i + 1]?.match(/^\| [-| ]+\|$/)) {
        out.push(meta.sep)
        i++
      }
      if (hasPreviewCol) {
        /* re-process data rows below with fresh preview cells */
      }
      continue
    }

    if (inTable && line.match(/^\| [-| ]+\|$/)) {
      out.push(line)
      continue
    }

    if (inTable && meta && line.startsWith('| ') && line.endsWith(' |')) {
      const parts = line.slice(1, -1).split('|').map((p) => p.trim())
      let label
      let htmlClass
      let catalog
      let url
      if (parts.length === 4) {
        ;[label, htmlClass, catalog, url] = parts
      } else if (parts.length === 5) {
        ;[, label, htmlClass, catalog, url] = parts
      } else {
        out.push(line)
        continue
      }
      out.push(
        `| ${previewCell(htmlClass)} | ${label} | ${htmlClass} | ${catalog} | ${url} |`,
      )
      continue
    }

    if (inTable && !line.startsWith('|')) {
      inTable = false
      meta = null
    }

    out.push(line)
  }

  fs.writeFileSync(filePath, out.join('\n'))
}

function updateMaintenanceSection() {
  const enPath = path.join(docDir, 'icone-references.md')
  let en = fs.readFileSync(enPath, 'utf8')
  if (!en.includes('doc:icon-previews')) {
    en = en.replace(
      '2. Update this file and [icone-references.fr.md](./icone-references.fr.md) in the same change.\n3. For geopf-only',
      '2. Update this file and [icone-references.fr.md](./icone-references.fr.md) in the same change.\n3. Run `npm run doc:icon-previews` and commit `doc/img/icon-previews/` (Preview column).\n4. For geopf-only',
    )
    fs.writeFileSync(enPath, en)
  }
  const frPath = path.join(docDir, 'icone-references.fr.md')
  let fr = fs.readFileSync(frPath, 'utf8')
  if (!fr.includes('doc:icon-previews')) {
    fr = fr.replace(
      '2. Mettre à jour ce fichier et [icone-references.md](./icone-references.md) dans le même changement.\n3. Pour une évolution geopf',
      '2. Mettre à jour ce fichier et [icone-references.md](./icone-references.md) dans le même changement.\n3. Exécuter `npm run doc:icon-previews` et versionner `doc/img/icon-previews/` (colonne Aperçu).\n4. Pour une évolution geopf',
    )
    fs.writeFileSync(frPath, fr)
  }
}

function addPreviewSectionIntro() {
  for (const [fileName, en] of [
    ['icone-references.md', true],
    ['icone-references.fr.md', false],
  ]) {
    const filePath = path.join(docDir, fileName)
    let text = fs.readFileSync(filePath, 'utf8')
    text = text.replace(
      / \(typical markup\), \*\*catalog\*\*, \*\*documentation URL\*\*\./g,
      '',
    )
    text = text.replace(/ \(balisage type\), \*\*catalogue\*\*, \*\*URL de documentation\*\*\./g, '')
    if (!text.includes('npm run doc:icon-previews')) {
      const block = en
        ? 'Columns: **preview** (SVG under `doc/img/icon-previews/`), **label**, **HTML class**, **catalog**, **documentation URL**.\n\nPreviews: `npm run doc:icon-previews` (from `@gouvfr/dsfr`, `remixicon`, project assets). Some DSFR-only font glyphs use a Remix SVG proxy; commit updated previews with doc changes.'
        : 'Colonnes : **aperçu** (SVG dans `doc/img/icon-previews/`), **libellé**, **classe HTML**, **catalogue**, **URL**.\n\nAperçus : `npm run doc:icon-previews` (`@gouvfr/dsfr`, `remixicon`, assets projet). Certains glyphes DSFR-only utilisent un SVG Remix de substitution ; versionner les aperçus avec la doc.'
      text = text.replace(
        /Inventory of pictograms[\s\S]*?\n\n## URL patterns/m,
        `Inventory of pictograms used in **entree-carto** (\`src/\` and bundled geopf controls).  \n${block}\n\n## URL patterns`,
      )
      if (!en) {
        text = text.replace(
          /Inventaire des pictogrammes[\s\S]*?\n\n## Formats d’URL/m,
          `Inventaire des pictogrammes utilisés dans **entree-carto** (\`src/\` et contrôles geopf bundlés).  \n${block}\n\n## Formats d’URL`,
        )
      }
    }
    fs.writeFileSync(filePath, text)
  }
}

const lookup = buildLookup()
syncAssets(lookup)
refreshPreviewColumn('icone-references.md')
refreshPreviewColumn('icone-references.fr.md')
addPreviewSectionIntro()
updateMaintenanceSection()
console.log(`Synced ${previewByClass.size} icon previews to doc/img/icon-previews/`)
