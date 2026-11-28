/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { provideMapMode, type MapModeContext } from '@/composables/mapMode'
import {
  ALL_MAP_MODES,
  MAP_MODE_COORDINATES,
  MAP_MODE_PARCEL,
  MAP_MODE_TERRITORY,
  normalizeMapModes,
  type MapModeId,
} from '@/lib/map/mapMode'
import MapModeSelector from '@/components/map/MapModeSelector.vue'
import { emptyFicheBodyHtml } from '@/composables/tabPanels'

function setup(options: { initial?: MapModeId; modes?: unknown }) {
  let ctx: MapModeContext | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        ctx = provideMapMode({ ...options, syncUrl: false })
        return () => h(MapModeSelector)
      },
    }),
    { global: { stubs: { teleport: true } } },
  )
  return { wrapper, ctx: ctx! }
}

describe('modes de la fiche info activés par la config', () => {
  it('liste normalisée dans l’ordre du sélecteur ; absente ou invalide = les trois modes', () => {
    expect(ALL_MAP_MODES).toEqual([MAP_MODE_COORDINATES, MAP_MODE_PARCEL, MAP_MODE_TERRITORY])
    expect(normalizeMapModes(undefined)).toEqual(ALL_MAP_MODES)
    expect(normalizeMapModes([])).toEqual(ALL_MAP_MODES)
    expect(normalizeMapModes(['x', 9])).toEqual(ALL_MAP_MODES)
    expect(normalizeMapModes([2, '1', 2])).toEqual([MAP_MODE_PARCEL, MAP_MODE_TERRITORY])
  })

  it('mode demandé absent : repli sur Territoire (sinon le premier mode activé) ; setMode ignoré', () => {
    const { ctx } = setup({ initial: MAP_MODE_COORDINATES, modes: [1, 2] })
    expect(ctx.mode.value).toBe(MAP_MODE_TERRITORY)
    ctx.setMode(MAP_MODE_COORDINATES)
    expect(ctx.mode.value).toBe(MAP_MODE_TERRITORY)
    expect(setup({ initial: MAP_MODE_TERRITORY, modes: [3] }).ctx.mode.value).toBe(
      MAP_MODE_COORDINATES,
    )
  })

  it('sélecteur : seulement les modes activés, masqué s’il n’en reste qu’un', () => {
    const texts = setup({ modes: [1, 2] })
      .wrapper.findAll('.ec-map-mode-selector__text')
      .map((t) => t.text())
    expect(texts).toEqual(['Parcelle', 'Territoire'])
    expect(
      setup({ modes: [1] })
        .wrapper.find('.ec-map-mode-selector')
        .exists(),
    ).toBe(false)
  })

  it('aide fiche vide : seulement les modes activés', () => {
    const html = emptyFicheBodyHtml([MAP_MODE_PARCEL, MAP_MODE_TERRITORY])
    expect(html).toContain('mode Parcelle')
    expect(html).toContain('mode Territoire')
    expect(html).not.toContain('Coordonnées')
    expect(emptyFicheBodyHtml(ALL_MAP_MODES)).toContain('mode Coordonnées')
  })
})
