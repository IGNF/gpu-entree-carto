import { describe, expect, it } from 'vitest'
import { panelTabs, TAB_PANEL_IDS } from '@/composables/tabPanels'

describe('panelTabs (onglets du panneau latéral)', () => {
  it('par défaut : les 4 onglets de la carte principale', () => {
    expect(panelTabs().map((t) => t.id)).toEqual([
      TAB_PANEL_IDS.fiche,
      TAB_PANEL_IDS.catalogue,
      TAB_PANEL_IDS.dataLayers,
      TAB_PANEL_IDS.legends,
    ])
  })

  it('onglets masqués retirés, onglet supplémentaire ajouté en dernier', () => {
    const tabs = panelTabs({
      hiddenTabs: [TAB_PANEL_IDS.dataLayers, TAB_PANEL_IDS.legends],
      extraTab: { label: 'Données brutes', iconKind: 'remix', iconClass: 'ri-code-s-slash-line' },
    })
    expect(tabs.map((t) => [t.id, t.label])).toEqual([
      [TAB_PANEL_IDS.fiche, 'Informations / localisation'],
      [TAB_PANEL_IDS.catalogue, 'Catalogue'],
      [TAB_PANEL_IDS.extra, 'Données brutes'],
    ])
  })
})
