import { afterEach, describe, expect, it, vi } from 'vitest'
import { locateParcelById } from '@/lib/search/locateParcelById'

const parts = { dep: '34', com: '301', arr: '000', comAbs: '000', section: 'AS', numero: '0136' }

afterEach(() => vi.unstubAllGlobals())

describe('locateParcelById (géocodage IGN, index parcelle)', () => {
  it('interroge les filtres cadastraux et renvoie un point à l’intérieur de la parcelle', async () => {
    const fetchMock = vi.fn<(input: string) => Promise<Response>>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            features: [
              {
                // Le point « position » du service peut tomber hors de la parcelle.
                geometry: { type: 'Point', coordinates: [3.6892, 43.3923] },
                properties: {
                  truegeometry: {
                    type: 'Polygon',
                    coordinates: [
                      [
                        [3.6917, 43.3929],
                        [3.6921, 43.3929],
                        [3.6921, 43.3925],
                        [3.6917, 43.3925],
                        [3.6917, 43.3929],
                      ],
                    ],
                  },
                },
              },
            ],
          }),
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const point = await locateParcelById(parts)
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      index: 'parcel',
      departmentcode: '34',
      municipalitycode: '301',
      districtcode: '000',
      oldmunicipalitycode: '000',
      section: 'AS',
      number: '0136',
    })
    expect(point!.lon).toBeGreaterThan(3.6917)
    expect(point!.lon).toBeLessThan(3.6921)
    expect(point!.lat).toBeGreaterThan(43.3925)
    expect(point!.lat).toBeLessThan(43.3929)
  })

  it('parcelle introuvable : null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ features: [] })))),
    )
    expect(await locateParcelById(parts)).toBeNull()
  })
})
