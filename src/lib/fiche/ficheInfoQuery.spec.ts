import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import {
  appendFicheInfoQueryParams,
  getActivePreviewDocument,
  parseDocumentBbox,
} from '@/lib/fiche/ficheInfoQuery'

describe('parseDocumentBbox', () => {
  it('parse une chaîne séparée par des virgules', () => {
    expect(parseDocumentBbox({ bbox: '2.1,48.9,2.5,49.1' })).toEqual([2.1, 48.9, 2.5, 49.1])
  })

  it('accepte un tableau de nombres', () => {
    expect(parseDocumentBbox({ bbox: [1, 2, 3, 4] })).toEqual([1, 2, 3, 4])
  })
})

describe('appendFicheInfoQueryParams', () => {
  beforeEach(() => {
    sessionStorage.clear()
    config.document = {
      id: 'doc-preview-1',
      status: 'document.preview',
      name: 'DU_75056',
    }
  })

  afterEach(() => {
    delete config.document
  })

  it('ajoute includeParcel, client, seq et preview', () => {
    const url = new URL('https://example.test/api/fiche-info')
    appendFicheInfoQueryParams(url, { lon: 2.35, lat: 48.85, zoom: 14.2 })
    expect(url.searchParams.get('includeParcel')).toBe('true')
    expect(url.searchParams.get('lon')).toBe('2.35')
    expect(url.searchParams.get('zoom')).toBe('14')
    expect(url.searchParams.get('zone')).toBe('validation')
    expect(url.searchParams.get('previewDocumentId')).toBe('doc-preview-1')
    expect(url.searchParams.get('partition')).toBe('DU_75056')
    expect(url.searchParams.get('client')).toBeTruthy()
    expect(url.searchParams.get('seq')).toBe('1')
  })
})

describe('getActivePreviewDocument', () => {
  afterEach(() => {
    delete config.document
  })

  it('lit config.document en priorité', () => {
    config.document = { id: 'x', status: 'document.preview' }
    expect(getActivePreviewDocument()?.id).toBe('x')
  })
})
