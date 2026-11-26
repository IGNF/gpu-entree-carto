import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  FICHE_USED_FIELDS,
  FICHE_PAYLOAD_DYNAMIC_PARENTS,
  ficheFieldUsage,
} from '@/lib/demo/ficheUsedFields'
import { recordPayloadReads } from '@/test/recordPayloadReads'
import { ficheSelectionFromGpuApi, type GpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  type GpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import {
  resolveInseeForCadastre,
  resolveTyperefForCadastre,
} from '@/lib/fiche/cadastreLowFromFicheInfo'
import { modeEmprisePartsFromFichePayload } from '@/lib/map/modeEmpriseFromFiche'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'

describe('ficheFieldUsage (motifs de chemins)', () => {
  const patterns = ['grid.name', 'dus.*.documents.*.title', 'gridGeometry.**']
  it('champ listé, joker, sous-arbre', () => {
    expect(ficheFieldUsage(['grid', 'name'], patterns)).toBe('used')
    expect(ficheFieldUsage(['dus', 'DU_31526', 'documents', '0', 'title'], patterns)).toBe('used')
    expect(ficheFieldUsage(['gridGeometry', 'coordinates', '0', '1'], patterns)).toBe('used')
  })
  it('conteneur dont un descendant est utilisé : partiel ; champ absent : non utilisé', () => {
    expect(ficheFieldUsage(['dus', 'DU_31526'], patterns)).toBe('partial')
    expect(ficheFieldUsage(['grid'], patterns)).toBe('partial')
    expect(ficheFieldUsage(['grid', 'is_rnu'], patterns)).toBe('unused')
    expect(
      ficheFieldUsage(['dus', 'DU_31526', 'documents', '0', 'hasPreviousVersions'], patterns),
    ).toBe('unused')
  })
})

/** Garde-fou : tout champ lu par la fiche sur des réponses réelles doit être déclaré utilisé. */
describe('FICHE_USED_FIELDS couvre les lectures réelles de la fiche', () => {
  const fixtures = ['salvetat', 'caen', 'paris', 'limouziniere'].map(
    (name) =>
      [
        name,
        JSON.parse(
          readFileSync(`src/test/fixtures/fiche-info/${name}.json`, 'utf8'),
        ) as GpuFicheInfoPayload & { parcelFiche?: GpuParcelFichePayload },
      ] as const,
  )

  for (const [name, data] of fixtures) {
    for (const mode of ['territory', 'parcel'] as const) {
      it(`${name} — fiche ${mode === 'parcel' ? 'parcelle' : 'territoire'}`, () => {
        const { proxy, reads } = recordPayloadReads(data, FICHE_PAYLOAD_DYNAMIC_PARENTS)
        const mapMode = mode === 'parcel' ? MAP_MODE_PARCEL : MAP_MODE_TERRITORY
        ficheSelectionFromGpuApi(proxy, mapMode, 1, 1)
        resolveTyperefForCadastre(proxy)
        resolveInseeForCadastre(proxy)
        modeEmprisePartsFromFichePayload(proxy, mapMode)
        if (mode === 'parcel' && proxy.parcelFiche) {
          buildParcelInfosHtmlFromFiche(proxy.parcelFiche, 16, proxy)
          buildParcelDocumentsHtmlFromFiche(proxy.parcelFiche, proxy)
        }
        const uncovered = [...reads].filter(
          (path) =>
            !path.endsWith('.length') &&
            ficheFieldUsage(path.split('.'), FICHE_USED_FIELDS[mode]) === 'unused',
        )
        expect(uncovered).toEqual([])
      })
    }
  }
})
