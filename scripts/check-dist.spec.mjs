/**
 * @vitest-environment node
 * Contrôle des bundles construits (scripts/check-dist.mjs).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const root = mkdtempSync(join(tmpdir(), 'ec-dist-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

function distWith(files) {
  const dir = mkdtempSync(join(root, 'case-'))
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    writeFileSync(join(dir, name), content)
  }
  return dir
}

function check(dir) {
  return spawnSync(process.execPath, ['scripts/check-dist.mjs', dir], { encoding: 'utf8' })
}

describe('check-dist', () => {
  it('accepte un dist sain (worker compilé en .js)', () => {
    const dir = distWith({
      'entree-carto.js': 'new Worker(new URL("assets/printExport.worker-embed.js", s))',
      'assets/printExport.worker-embed.js': 'self.onmessage=()=>{}',
    })
    expect(check(dir).status).toBe(0)
  })

  it('refuse un appel eval(', () => {
    expect(check(distWith({ 'a.js': 'x = eval("1")' })).status).toBe(1)
  })

  it('refuse un fichier source .ts copié tel quel (servi en video/mp2t)', () => {
    const res = check(distWith({ 'assets/printExport.worker-Rff5B1mw.ts': 'import x' }))
    expect(res.status).toBe(1)
    expect(res.stderr).toMatch(/printExport\.worker-Rff5B1mw\.ts/)
  })

  it('refuse un worker inliné en data:video/mp2t (source TS en base64)', () => {
    const res = check(distWith({ 'entree-carto.js': 'new URL("data:video/mp2t;base64,aW1w")' }))
    expect(res.status).toBe(1)
    expect(res.stderr).toMatch(/video\/mp2t/)
  })

  it('n’est pas trompé par des noms comme retrieval( ou .d.ts dans du texte', () => {
    const dir = distWith({ 'a.js': 'retrieval(1); const n = "types.d.ts"' })
    expect(check(dir).status).toBe(0)
  })
})
