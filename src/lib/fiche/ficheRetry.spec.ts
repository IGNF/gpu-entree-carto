/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { sanitizeDisplayHtml } from '@/components/common/sanitizedHtmlCore'
import {
  ficheRetryParamsFromSelection,
  ficheServiceUnavailableSelection,
  isFicheRetryClick,
} from '@/lib/fiche/ficheRetry'
import { MAP_MODE_PARCEL } from '@/lib/map/mapMode'
import {
  isParcelFichePrintReady,
  isTerritoryFichePrintReady,
} from '@/lib/map/print/printFicheSnapshot'

const params = { lon: 3.75, lat: 47.45, mode: MAP_MODE_PARCEL, zoom: 16, loadingTitle: 'Parcelle' }

describe('fiche info : « Indisponibilité du service » + Réessayer', () => {
  it('bouton tertiaire icône ri-refresh-line, title « Réessayer », à côté du texte', () => {
    const sel = ficheServiceUnavailableSelection('Parcelle', params)
    const div = document.createElement('div')
    div.innerHTML = sanitizeDisplayHtml(sel.bodyHtml ?? '', true)
    const p = div.querySelector('p')!
    expect(p.textContent?.trim()).toBe('Indisponibilité du service')
    const btn = p.querySelector('button')!
    expect(btn.classList.contains('fr-btn')).toBe(true)
    expect(btn.classList.contains('fr-btn--tertiary')).toBe(true)
    expect(btn.getAttribute('title')).toBe('Réessayer')
    expect(btn.querySelector('i.ri-refresh-line')).not.toBeNull()
  })

  it('HTTP 429 : « Service temporairement saturé, réessayez. » avec le bouton Réessayer', () => {
    const sel = ficheServiceUnavailableSelection('Parcelle', params, true)
    const div = document.createElement('div')
    div.innerHTML = sanitizeDisplayHtml(sel.bodyHtml ?? '', true)
    const p = div.querySelector('p')!
    expect(p.textContent?.trim()).toBe('Service temporairement saturé, réessayez.')
    expect(p.querySelector('button')).not.toBeNull()
    expect(ficheRetryParamsFromSelection(sel)).toEqual(params)
  })

  it('relance avec les paramètres de la requête échouée', () => {
    const sel = ficheServiceUnavailableSelection('Parcelle', params)
    expect(ficheRetryParamsFromSelection(sel)).toEqual(params)
    expect(ficheRetryParamsFromSelection({ title: 'x', bodyHtml: '<p>x</p>' })).toBeNull()
  })

  it('reconnaît le clic sur le bouton (ou son icône)', () => {
    const div = document.createElement('div')
    div.innerHTML = ficheServiceUnavailableSelection('Parcelle', params).bodyHtml ?? ''
    const onIcon = new MouseEvent('click', { bubbles: true })
    let seen: MouseEvent | null = null
    div.addEventListener('click', (e) => (seen = e))
    div.querySelector('i')!.dispatchEvent(onIcon)
    expect(isFicheRetryClick(seen!)).toBe(true)
    div.querySelector('p')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(isFicheRetryClick(seen!)).toBe(false)
  })

  it('fiche indisponible : pas imprimable', () => {
    const sel = {
      ...ficheServiceUnavailableSelection('Parcelle', params),
      mapMode: MAP_MODE_PARCEL,
    }
    expect(isTerritoryFichePrintReady(sel)).toBe(false)
    expect(isParcelFichePrintReady(sel)).toBe(false)
  })
})
