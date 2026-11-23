/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { findElementByDataset } from '@/lib/demo/findByDataset'
import { loadScriptOnce, loadStylesheetOnce } from '@/lib/demo/demoLibAssets'

/** URL contenant des caractères qui cassent un sélecteur CSS interpolé (`"`, `]`). */
const TRICKY_URL = 'https://example.test/a"]b.js?x=1'

describe('findElementByDataset (sélecteurs sans interpolation)', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('retrouve un élément dont la valeur data-* contient des guillemets', () => {
    const script = document.createElement('script')
    script.dataset.ecLibJs = TRICKY_URL
    document.body.appendChild(script)
    expect(findElementByDataset('script', 'ecLibJs', TRICKY_URL)).toBe(script)
  })

  it('ne confond pas deux valeurs proches', () => {
    const script = document.createElement('script')
    script.dataset.ecLibJs = 'https://example.test/a.js'
    document.body.appendChild(script)
    expect(findElementByDataset('script', 'ecLibJs', 'https://example.test/a.js?x')).toBeNull()
  })

  it('loadScriptOnce ne lève pas d’erreur de sélecteur et réutilise le script existant', async () => {
    const script = document.createElement('script')
    script.dataset.ecLibJs = TRICKY_URL
    document.body.appendChild(script)
    await expect(loadScriptOnce(TRICKY_URL)).resolves.toBeUndefined()
    expect(document.querySelectorAll('script').length).toBe(1)
  })

  it('loadStylesheetOnce ne lève pas d’erreur de sélecteur et réutilise la feuille existante', async () => {
    const link = document.createElement('link')
    link.dataset.ecLibCss = TRICKY_URL
    document.head.appendChild(link)
    await expect(loadStylesheetOnce(TRICKY_URL)).resolves.toBeUndefined()
    expect(document.querySelectorAll('link').length).toBe(1)
  })
})
