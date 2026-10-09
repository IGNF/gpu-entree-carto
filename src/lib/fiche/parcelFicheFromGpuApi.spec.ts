import { describe, expect, it } from 'vitest'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  isGpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'

const sample: Parameters<typeof buildParcelInfosHtmlFromFiche>[0] = {
  features: [
    {
      id: 'zone_urba.1',
      properties: {
        typezone: 'U',
        libelle: 'UM',
        libelong: 'Zone urbaine',
        urlfic: 'https://example.com/reg.pdf',
      },
    },
    {
      id: 'document.2',
      properties: {
        title: 'PLU Paris',
        status: 'document.production',
        type: 'PLU',
      },
    },
  ],
}

describe('isGpuParcelFichePayload', () => {
  it('requiert features', () => {
    expect(isGpuParcelFichePayload(sample)).toBe(true)
    expect(isGpuParcelFichePayload({ parcel: {} })).toBe(false)
  })
})

describe('buildParcelInfosHtmlFromFiche', () => {
  it('contient une section zonage et une ligne de règle', () => {
    const html = buildParcelInfosHtmlFromFiche(sample)
    expect(html).toContain('ec-fiche-info__rules-section')
    expect(html).toContain('Zonage(s)')
    expect(html).toContain('Zone urbaine')
    expect(html).toContain('ec-fiche-info__rule-row')
  })
})

describe('buildParcelDocumentsHtmlFromFiche', () => {
  it('liste les features document', () => {
    const html = buildParcelDocumentsHtmlFromFiche(sample)
    expect(html).toContain('ec-fiche-info__doc-card')
    expect(html).toContain('PLU Paris')
    expect(html).toContain('ec-fiche-info__badge--vigueur')
    expect(html).not.toContain('ec-fiche-info__callout')
  })

  it('encart et badge warning seulement si document non exécutoire', () => {
    const html = buildParcelDocumentsHtmlFromFiche({
      features: [
        {
          id: 'document.1',
          properties: {
            title: 'PLU obsolète',
            status: 'document.production',
            effectiveStatus: 'NON_EXECUTOIRE',
          },
        },
      ],
    })
    expect(html).toContain('ec-fiche-info__callout')
    expect(html).toContain('Certains documents ne sont pas exécutoires')
    expect(html).toContain('ec-fiche-info__badge--non-executoire')
    expect(html).not.toContain('ec-fiche-info__badge--vigueur')
  })
})
