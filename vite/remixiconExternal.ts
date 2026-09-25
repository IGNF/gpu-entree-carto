import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const REMIXICON_CSS = fileURLToPath(
  new URL('../node_modules/remixicon/fonts/remixicon.css', import.meta.url),
)
const REMIXICON_DIR = path.dirname(REMIXICON_CSS)
const REMIXICON_WOFF2 = path.join(REMIXICON_DIR, 'remixicon.woff2')

const REMIXICON_ID = '\0entree-carto:remixicon.css'

/**
 * Remix Icon sans police SVG inline (SVGO postcss sur gpu-site) ni base64 woff2.
 * Émet remixicon.woff2 sous dist/css/fonts/ et classes .ri-* dans le CSS bundle.
 */
export function remixiconExternal(): Plugin {
  return {
    name: 'entree-carto-remixicon-external',
    enforce: 'pre',
    resolveId(id) {
      if (id.includes('remixicon/fonts/remixicon.css')) return REMIXICON_ID
      return null
    },
    load(id) {
      if (id !== REMIXICON_ID) return null
      const raw = readFileSync(REMIXICON_CSS, 'utf8')
      const classRules = raw.replace(/@font-face\s*\{[\s\S]*?\}/, '').trimStart()
      return `@font-face {
  font-family: "remixicon";
  src: url(${JSON.stringify(REMIXICON_WOFF2)}) format("woff2");
  font-display: swap;
}
${classRules}
`
    },
    config() {
      return {
        build: {
          assetsInlineLimit: 0,
        },
      }
    },
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist')
      const assetsDir = path.join(outDir, 'assets')
      let woff2Name: string | undefined
      try {
        woff2Name = readdirSync(assetsDir).find(
          (name) => name.startsWith('remixicon') && name.endsWith('.woff2'),
        )
      } catch {
        return
      }
      if (!woff2Name) return
      const fontUrl = `../assets/${woff2Name}`
      const cssDir = path.join(outDir, 'css')
      let cssFiles: string[]
      try {
        cssFiles = readdirSync(cssDir).filter((name) => name.endsWith('.css'))
      } catch {
        return
      }
      const base64Woff2 = /url\(["']?data:font\/woff2;base64,[^"')]+["']?\)/g
      for (const name of cssFiles) {
        const file = path.join(cssDir, name)
        let source = readFileSync(file, 'utf8')
        if (!source.includes('remixicon') && !source.includes('data:font/woff2')) continue
        const next = source
          .replace(base64Woff2, `url("${fontUrl}")`)
          .replace(
            /,?\s*url\(["']?data:image\/svg\+xml[^)]*remixicon[^)]*\)\s*format\(["']svg["']\)/gi,
            '',
          )
        if (next !== source) writeFileSync(file, next)
      }
    },
  }
}
