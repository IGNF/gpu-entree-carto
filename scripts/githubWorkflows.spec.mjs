/**
 * @vitest-environment node
 * Garde-fous sécurité sur les workflows GitHub Actions.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pages = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8')
const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

describe('pages.yml', () => {
  it('ne déploie que les runs CI issus d’un push (pas de PR de fork nommée main)', () => {
    expect(pages).toMatch(/github\.event\.workflow_run\.event\s*==\s*'push'/)
  })

  it('vérifie que le run CI provient du dépôt lui-même', () => {
    expect(pages).toMatch(
      /github\.event\.workflow_run\.head_repository\.full_name\s*==\s*github\.repository/,
    )
  })

  it('exige toujours un CI réussi', () => {
    expect(pages).toMatch(/github\.event\.workflow_run\.conclusion\s*==\s*'success'/)
  })
})

describe('ci.yml', () => {
  it('contrôle les bundles construits (eval, sources .ts)', () => {
    expect(ci).toMatch(/npm run verify:dist/)
  })
})
