import { describe, expect, it, beforeEach } from 'vitest'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { MAP_MODE_PARCEL } from '@/lib/map/mapMode'
import {
  applyParcelFicheDetailCache,
  clearParcelFicheDetailCacheForTests,
  storeParcelFicheDetailCache,
} from '@/lib/fiche/parcelFicheDetailCache'

describe('parcelFicheDetailCache', () => {
  beforeEach(() => {
    clearParcelFicheDetailCacheForTests()
  })

  it('réinjecte Infos/Documents pour le même parcelId', () => {
    storeParcelFicheDetailCache({
      parcelId: '62_001_000_000_AK_0432',
      parcelFiche: { features: [], parcel: { type: 'FeatureCollection', features: [] } },
      parcelInfosHtml: '<p>Infos cache</p>',
      parcelDocumentsHtml: '<p>Docs cache</p>',
    })
    const fresh: FicheInfoSelection = {
      title: 'AK 0432',
      mapMode: MAP_MODE_PARCEL,
      parcelLabel: 'AK 0432',
      raw: {
        code_dep: '62',
        code_com: '001',
        code_arr: '000',
        com_abs: '000',
        section: 'AK',
        numero: '0432',
        mode: MAP_MODE_PARCEL,
      },
    }
    const merged = applyParcelFicheDetailCache(fresh)
    expect(merged.parcelInfosHtml).toBe('<p>Infos cache</p>')
    expect(merged.parcelDocumentsHtml).toBe('<p>Docs cache</p>')
    expect(merged.raw?._parcelFiche).toBeTruthy()
  })
})
