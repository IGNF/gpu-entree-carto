/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sanitizeDisplayHtml } from '@/components/common/sanitizedHtmlCore'
import { TAB_PANEL_IDS, tabPanelsApiRef, type TabPanelsApi } from '@/composables/tabPanels'
import { ficheSelectionFromGpuApi } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  NO_MUNICIPALITY_AT_POINT_DOCUMENT_HTML,
  PARCEL_NO_RULE_HTML,
  TERRITORY_NO_DOCUMENT_HTML,
  onFicheCatalogLinkClick,
  stripFicheNoDataHtml,
} from '@/lib/fiche/ficheNoDataMessages'
import { MAP_MODE_TERRITORY } from '@/lib/map/mapMode'

afterEach(() => {
  tabPanelsApiRef.value = null
})

const text = (html: string) => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent
}

describe('messages « pas de données » de la fiche info', () => {
  it('libellés exacts, « catalogue de couches » en lien vers le catalogue', () => {
    expect(text(TERRITORY_NO_DOCUMENT_HTML)).toBe(
      'Pas de document trouvé sur ce territoire dans les données correspondant au catalogue de couches actuel.',
    )
    expect(text(PARCEL_NO_RULE_HTML)).toBe(
      'Pas de règle d’urbanisme trouvé dans les données correspondant au catalogue de couches actuel intersectant cette parcelle.',
    )
    expect(text(NO_MUNICIPALITY_AT_POINT_DOCUMENT_HTML)).toBe(
      'Pas de document trouvé à cet emplacement dans les données correspondant au catalogue de couches actuel.',
    )
    expect(stripFicheNoDataHtml(NO_MUNICIPALITY_AT_POINT_DOCUMENT_HTML)).toBe('')
    for (const html of [
      TERRITORY_NO_DOCUMENT_HTML,
      PARCEL_NO_RULE_HTML,
      NO_MUNICIPALITY_AT_POINT_DOCUMENT_HTML,
    ]) {
      const div = document.createElement('div')
      // Passe par le même nettoyage que l’affichage du panneau.
      div.innerHTML = sanitizeDisplayHtml(html, true)
      expect(div.querySelector('a[data-ec-open-catalog]')?.textContent).toBe('catalogue de couches')
    }
  })

  it('fiche territoire sans document : nouveau message', () => {
    const sel = ficheSelectionFromGpuApi(
      { grid: { name: 'SAINT-PERE', insee: '89364' } },
      MAP_MODE_TERRITORY,
      3.75,
      47.45,
    )
    expect(sel.bodyHtml).toBe(TERRITORY_NO_DOCUMENT_HTML)
  })

  it('clic sur le lien : ouvre l’onglet catalogue de couches', () => {
    const openTab = vi.fn()
    tabPanelsApiRef.value = { openTab } as unknown as TabPanelsApi
    const host = document.createElement('div')
    host.innerHTML = PARCEL_NO_RULE_HTML
    host.addEventListener('click', onFicheCatalogLinkClick)
    document.body.appendChild(host)
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    host.querySelector('a')!.dispatchEvent(event)
    expect(openTab).toHaveBeenCalledWith(TAB_PANEL_IDS.catalogue)
    expect(event.defaultPrevented).toBe(true)
    host.remove()
  })

  it('impression : messages retirés, le reste conservé', () => {
    expect(stripFicheNoDataHtml(TERRITORY_NO_DOCUMENT_HTML)).toBe('')
    expect(stripFicheNoDataHtml(PARCEL_NO_RULE_HTML)).toBe('')
    expect(stripFicheNoDataHtml('<p>RNU</p>')).toBe('<p>RNU</p>')
  })
})
