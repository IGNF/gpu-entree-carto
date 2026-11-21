import { describe, expect, it } from 'vitest'
import { appendFicheInfoQueryParams } from '@/lib/fiche/ficheInfoQuery'

describe('appendFicheInfoQueryParams', () => {
  it('ajoute activeSupTypes[] pour gpu-site', () => {
    const url = new URL('https://example.com/api/fiche-info-v2', 'https://example.com')
    appendFicheInfoQueryParams(url, {
      lon: 1,
      lat: 2,
      zoom: 14,
      activeSupTypes: ['AC1', 'ac4'],
    })
    expect(url.searchParams.getAll('activeSupTypes[]')).toEqual(['AC1', 'AC4'])
  })

  it('ajoute activeFamilies[] pour gpu-site', () => {
    const url = new URL('http://localhost/api/fiche-info-v2')
    appendFicheInfoQueryParams(url, {
      lon: 1.05,
      lat: 48.45,
      zoom: 16,
      activeFamilies: ['du', 'sup'],
    })
    expect(url.searchParams.getAll('activeFamilies[]')).toEqual(['du', 'sup'])
  })
})
