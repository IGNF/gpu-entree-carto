import { createReadStream, existsSync, statSync } from 'node:fs'
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
/** Expose `dist/*.js` et `dist/css/*` en dev / preview (option `useMinimified` dans demo-config). */
export function serveDistLibAssets(): Plugin {
  const distRoot = path.resolve(process.cwd(), 'dist')
  const contentTypes: Record<string, string> = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
  }

  function serveDistLibMiddleware(
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    next: (err?: unknown) => void,
  ): void {
    const urlPath = req.url?.split('?')[0] ?? ''
    if (!urlPath.startsWith('/dist/')) return next()
    const rel = urlPath.slice('/dist/'.length)
    if (!rel || rel.includes('..')) return next()
    const filePath = path.join(distRoot, rel)
    if (!filePath.startsWith(distRoot) || !existsSync(filePath)) return next()
    try {
      if (!statSync(filePath).isFile()) return next()
    } catch {
      return next()
    }
    const ext = path.extname(filePath)
    res.setHeader('Content-Type', contentTypes[ext] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  }

  return {
    name: 'entree-carto-serve-dist-lib',
    configureServer(server) {
      server.middlewares.use(serveDistLibMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveDistLibMiddleware)
    },
  }
}

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
