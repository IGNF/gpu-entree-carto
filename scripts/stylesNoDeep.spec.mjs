/**
 * @vitest-environment node
 * `:deep()` n’existe que dans les <style scoped> Vue : dans un .css ordinaire le sélecteur est
 * invalide et la règle entière est ignorée (sous-titres de fiche imprimée restés à la taille écran).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = new URL('../src/styles/', import.meta.url).pathname

describe('src/styles/*.css', () => {
  it('n’utilise pas :deep() (ignoré hors <style scoped>)', () => {
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.css'))
      .filter((f) => readFileSync(join(dir, f), 'utf8').includes(':deep('))
    expect(offenders).toEqual([])
  })
})
