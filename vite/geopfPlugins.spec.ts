/**
 * @vitest-environment node
 * Plugin Vite : suppression de l’eval de geopf Search.js (setUrl).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { patchGeopfSearchEval } from './geopfPlugins'

type LoadFn = (id: string) => string | null | undefined

function loadHook(): LoadFn {
  const plugin = patchGeopfSearchEval()
  return plugin.load as unknown as LoadFn
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'ec-geopf-'))
afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }))

function fixture(code: string): string {
  const file = join(
    tmpRoot,
    `case-${Math.random().toString(36).slice(2)}`,
    'node_modules/geopf-extensions-openlayers/src/packages/Services/Search.js',
  )
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, code)
  return file
}

describe('patchGeopfSearchEval', () => {
  it('retire l’eval du Search.js réellement installé', () => {
    const require = createRequire(import.meta.url)
    const pkgDir = dirname(require.resolve('geopf-extensions-openlayers/package.json'))
    const id = join(pkgDir, 'src/packages/Services/Search.js')
    const out = loadHook()(id)
    expect(typeof out).toBe('string')
    expect(out).not.toMatch(/\beval\s*\(/)
    expect(out).toContain('m_url = String(value ?? "")')
  })

  it('remplace la forme connue', () => {
    const out = loadHook()(
      fixture('function setUrl(value){ m_url = eval("`" + value + "`"); // insecure !\n}'),
    )
    expect(out).not.toMatch(/\beval\s*\(/)
  })

  it('fait échouer le build si un eval subsiste sous une forme inconnue (mise à jour amont)', () => {
    const id = fixture('function setUrl(value){ m_url = eval( "`"+value+"`" ) // still insecure\n}')
    expect(() => loadHook()(id)).toThrow(/eval/)
  })

  it('laisse passer un Search.js déjà corrigé en amont (sans eval)', () => {
    const code = 'function setUrl(value){ m_url = value; }'
    expect(loadHook()(fixture(code))).toBe(code)
  })

  it('ignore les autres modules', () => {
    expect(loadHook()('/x/node_modules/ol/Map.js')).toBeNull()
  })
})
