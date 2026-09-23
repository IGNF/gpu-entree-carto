import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/** Script gpu-client-config prod (démo GitHub Pages). */
export const GPU_PROD_CONFIG_SCRIPT_URL =
  'https://www.geoportail-urbanisme.gouv.fr/map/gpu-client-config.js'

const CONFIG_SCRIPT_URL_PATTERN = /(configScriptUrl:\s*)'[^']*'/

/**
 * Build Pages (`ENTREE_CARTO_DEMO_PAGES=1`) : remplace configScriptUrl dans dist/js/demo-config.js
 * (copie statique de public/) sans modifier le fichier source (dev local gpu-site).
 */
export function patchDemoConfigForPages(): Plugin {
  return {
    name: 'entree-carto-demo-config-pages',
    apply: 'build',
    closeBundle() {
      if (process.env.ENTREE_CARTO_DEMO_PAGES !== '1') return
      const file = path.resolve(process.cwd(), 'dist/js/demo-config.js')
      let source: string
      try {
        source = readFileSync(file, 'utf8')
      } catch {
        return
      }
      if (!CONFIG_SCRIPT_URL_PATTERN.test(source)) {
        console.warn(
          '[entree-carto-demo-config-pages] configScriptUrl introuvable dans dist/js/demo-config.js',
        )
        return
      }
      const next = source.replace(
        CONFIG_SCRIPT_URL_PATTERN,
        `$1'${GPU_PROD_CONFIG_SCRIPT_URL}'`,
      )
      writeFileSync(file, next)
    },
  }
}
