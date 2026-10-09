import { describe, expect, it } from 'vitest'
import { buildParcelIdFromProperties, resolveParcelIdFromRaw } from '@/lib/fiche/parcelId'

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
