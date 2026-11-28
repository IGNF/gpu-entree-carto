/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, provide, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const focus = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/lib/map/focusModeEmprise', () => ({ focusModeEmpriseOnMap: focus }))
vi.mock('@/lib/fiche/ficheInfoService', async (orig) => ({
  ...(await orig<typeof import('@/lib/fiche/ficheInfoService')>()),
  refreshFicheForMapModeChange: vi.fn(),
}))

import FicheInfoPanel from '@/components/panels/FicheInfoPanel.vue'
import { provideMapMode } from '@/composables/mapMode'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { MAP_MODE_COORDINATES, MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import OlMap from 'ol/Map'
import View from 'ol/View'
import { stubResizeObserver } from '@/test/olJsdom'

stubResizeObserver()

const selection: FicheInfoSelection = {
  title: 'AC 0260',
  mapMode: MAP_MODE_PARCEL,
  parcelLabel: 'AC 0260',
  territoryTitle: 'La Salvetat-Saint-Gilles (31526)',
  raw: { grid: { name: 'X' } },
}

/** Fiche parcelle montée avec le contexte de mode et une carte. */
function mountParcelFiche(modes?: number[]) {
  const map = new OlMap({ view: new View({ center: [0, 0], zoom: 12 }) })
  let mapMode: ReturnType<typeof provideMapMode> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        mapMode = provideMapMode({ initial: MAP_MODE_PARCEL, syncUrl: false, modes })
        provide('olMap', shallowRef(map))
        return () => h(FicheInfoPanel, { selection })
      },
    }),
    { global: { stubs: { teleport: true } } },
  )
  return { map, wrapper, mapMode: mapMode! }
}

describe('FicheInfoPanel — bascule de mode depuis la fiche', () => {
  it('bouton de la commune : passe en Territoire et recentre sur l’emprise', async () => {
    const { map, wrapper } = mountParcelFiche()
    await wrapper.find('.ec-fiche-info__territory-cta').trigger('click')
    await Promise.resolve()
    expect(focus).toHaveBeenCalledWith(map, MAP_MODE_TERRITORY, { skipFicheRefresh: true })
  })

  it('Parcelle ↔ Coordonnées : un sous-panneau par mode (glissement), identifiants d’onglets distincts', async () => {
    const { wrapper, mapMode } = mountParcelFiche()
    const parcel = wrapper.find('.ec-fiche-info__inner--parcel')
    expect(parcel.exists()).toBe(true)
    expect(wrapper.find('[role="tab"]').attributes('id')).toBe('ec-fiche-parcel-tab-infos')

    mapMode.setMode(MAP_MODE_COORDINATES)
    await nextTick()
    const coordinates = wrapper.find('.ec-fiche-info__inner--coordinates')
    expect(coordinates.exists()).toBe(true)
    expect(coordinates.element).not.toBe(parcel.element)
    expect(wrapper.find('.ec-fiche-info__inner--parcel').exists()).toBe(false)
    expect(wrapper.find('[role="tab"]').attributes('id')).toBe('ec-fiche-coordinates-tab-infos')
  })

  it('mode Territoire absent : la commune est un texte, pas un bouton de bascule', () => {
    const { wrapper } = mountParcelFiche([MAP_MODE_PARCEL])
    expect(wrapper.find('.ec-fiche-info__territory-cta').exists()).toBe(false)
    expect(wrapper.find('.ec-fiche-info__mode-switch-text').text()).toContain(
      'La Salvetat-Saint-Gilles (31526)',
    )
  })
})
