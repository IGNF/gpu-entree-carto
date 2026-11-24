/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'map-print-supplement.css'), 'utf8')

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('map-print-supplement.css', () => {
  it('paragraphe sans classe (« Aucun document. ») : taille de la page annexe, pas le 1rem DSFR', () => {
    const style = document.createElement('style')
    // DSFR : p { font-size: 1rem; line-height: 1.5rem } — tailles écran, minuscules au DPI d’export.
    style.textContent = `p { font-size: 1rem; line-height: 1.5rem; }\n${css}`
    document.head.appendChild(style)
    document.body.innerHTML =
      '<article class="ec-print-supplement-page" style="font-size: 40px"><div class="ec-print-fiche"><p>Aucun document.</p><p class="ec-fiche-info__rule-title">Titre</p></div></article>'
    const [plain, titled] = document.querySelectorAll('p')
    expect(getComputedStyle(plain).fontSize).toBe('40px')
    // Les paragraphes typés gardent leur propre taille.
    expect(getComputedStyle(titled).fontSize).not.toBe('40px')
  })
})
