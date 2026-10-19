import { describe, expect, it } from 'vitest'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import {
  isParcelFichePrintReady,
  isTerritoryFichePrintReady,
  normalizeFicheSelectionForPrint,
} from '@/lib/map/print/printFicheSnapshot'
import type { FicheInfoSelection } from '@/composables/tabPanels'

describe('printFicheSnapshot', () => {
  it('active la fiche parcelle depuis une sélection territoire avec JSON combiné', () => {
    const territoryPanel: FicheInfoSelection = {
      title: 'Commune',
      mapMode: MAP_MODE_TERRITORY,
      documentTabs: [{ id: 'du', label: 'DU', bodyHtml: '<p>Doc</p>' }],
      raw: {
        lon: 1.4,
        lat: 43.6,
        grid: { insee: '31526', label: 'La Salvetat-Saint-Gilles' },
        parcel: { section: 'AO', numero: '0015' },
      },
    }
    expect(isTerritoryFichePrintReady(territoryPanel)).toBe(true)
    expect(isParcelFichePrintReady(territoryPanel)).toBe(true)
    const parcel = normalizeFicheSelectionForPrint(territoryPanel, MAP_MODE_PARCEL)
    expect(parcel?.mapMode).toBe(MAP_MODE_PARCEL)
    expect(parcel?.cadastreReferences).toBeTruthy()
  })

  it('active la fiche territoire depuis une sélection parcelle avec JSON combiné', () => {
    const parcelPanel: FicheInfoSelection = {
      title: 'AO 0015',
      mapMode: MAP_MODE_PARCEL,
      parcelLabel: 'AO 0015',
      cadastreReferences: {
        headline: '31526000AO0015',
        rows: [{ label: 'Commune', value: 'La Salvetat-Saint-Gilles' }],
      },
      parcelInfosHtml: '<p>Infos</p>',
      raw: {
        lon: 1.4,
        lat: 43.6,
        grid: { insee: '31526', label: 'La Salvetat-Saint-Gilles' },
        parcel: { section: 'AO', numero: '0015' },
      },
    }
    expect(isParcelFichePrintReady(parcelPanel)).toBe(true)
    expect(isTerritoryFichePrintReady(parcelPanel)).toBe(true)
    const territory = normalizeFicheSelectionForPrint(parcelPanel, MAP_MODE_TERRITORY)
    expect(territory?.mapMode).toBe(MAP_MODE_TERRITORY)
    expect(isTerritoryFichePrintReady(territory)).toBe(true)
  })
})
