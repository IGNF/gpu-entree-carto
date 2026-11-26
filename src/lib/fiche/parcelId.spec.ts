import { describe, expect, it } from 'vitest'
import {
  parseParcelIdInput,
  buildParcelIdFromProperties,
  parcelGpuIdFromCadastralIdu,
  resolveParcelIdFromRaw,
} from '@/lib/fiche/parcelId'

describe('buildParcelIdFromProperties', () => {
  it('assemble l’identifiant gpu-site', () => {
    expect(
      buildParcelIdFromProperties({
        code_dep: '95',
        code_com: '197',
        code_arr: '000',
        com_abs: '000',
        section: 'AK',
        numero: '0432',
      }),
    ).toBe('95_197_000_000_AK_0432')
  })

  it('retourne null si un champ manque', () => {
    expect(buildParcelIdFromProperties({ code_dep: '95', section: 'AK' })).toBeNull()
  })
})

describe('resolveParcelIdFromRaw', () => {
  it('utilise parcelId direct', () => {
    expect(resolveParcelIdFromRaw({ parcelId: '95_197_000_000_AK_0432' })).toBe(
      '95_197_000_000_AK_0432',
    )
  })

  it('convertit parcelId IDU (sans underscore) vers l’identifiant gpu-site', () => {
    expect(resolveParcelIdFromRaw({ parcelId: '95197000AK0432' })).toBe('95_197_000_000_AK_0432')
  })

  it('convertit parcel.idu en identifiant gpu-site', () => {
    expect(
      resolveParcelIdFromRaw({
        parcel: { idu: '95197000AK0432' },
      }),
    ).toBe('95_197_000_000_AK_0432')
  })

  it('dérive depuis raw.parcel.features', () => {
    expect(
      resolveParcelIdFromRaw({
        parcel: {
          features: [
            {
              properties: {
                code_dep: '75',
                code_com: '056',
                code_arr: '000',
                com_abs: '000',
                section: 'AB',
                numero: '0001',
              },
            },
          ],
        },
      }),
    ).toBe('75_056_000_000_AB_0001')
  })
})

describe('parcelGpuIdFromCadastralIdu', () => {
  it('rejette les chaînes déjà au format underscore', () => {
    expect(parcelGpuIdFromCadastralIdu('95_197_000_000_AK_0432')).toBeNull()
  })
})

describe('parseParcelIdInput (saisie démo fiche parcelle)', () => {
  const expected = {
    dep: '34',
    com: '301',
    arr: '000',
    comAbs: '000',
    section: 'AS',
    numero: '0136',
  }

  it('forme avec séparateurs et forme compacte (17 caractères)', () => {
    expect(parseParcelIdInput('34_301_000_000_AS_0136')).toEqual(expected)
    expect(parseParcelIdInput('34301000000AS0136')).toEqual(expected)
  })

  it('espaces et minuscules tolérés ; Corse et section avec chiffre', () => {
    expect(parseParcelIdInput('  34301000000as0136 ')).toEqual(expected)
    expect(parseParcelIdInput('2A_004_000_000_0A_0012')).toMatchObject({ dep: '2A', section: '0A' })
  })

  it('format invalide : null', () => {
    for (const raw of ['', '34_301_AS_0136', '34301000AS0136', '34301000000AS013', 'abc']) {
      expect(parseParcelIdInput(raw)).toBeNull()
    }
  })
})
