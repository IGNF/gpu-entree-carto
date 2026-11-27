/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import { setGpuClientConfigScriptUrl } from '@/lib/configUrls'
import {
  resolveDocumentTileHref,
  resolveGpuDocumentViewUrl,
  resolveMecDocumentTileHref,
  resolveGpuProcedureViewUrl,
} from '@/lib/fiche/ficheGpuSiteUrls'

/** Évite les lignes > 100 car. (Prettier) après fusion avec `main`. */
const PROCEDURE_ID_PLACEHOLDER = '__GPU_PROCEDURE_ID__'
const GPU_SITE_PROCEDURE_VIEW_URL = `http://127.0.0.1:8000/procedure/view/${PROCEDURE_ID_PLACEHOLDER}`
const PROXY_PROCEDURE_VIEW_URL = `/__gpu_dev_proxy__/procedure/view/${PROCEDURE_ID_PLACEHOLDER}`

describe('ficheGpuSiteUrls', () => {
  afterEach(() => {
    setGpuClientConfigScriptUrl(null)
    delete config.procedureViewUrl
    delete config.documentViewUrl
    delete config.urlPlaceholders
  })

  it('résout viewUrl relative contre gpu-client-config (démo Vite)', () => {
    setGpuClientConfigScriptUrl('http://127.0.0.1:8000/map/gpu-client-config.js')
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173/map'),
      writable: true,
    })

    expect(
      resolveDocumentTileHref({
        viewUrl: '/document/abc123',
      }),
    ).toBe('http://127.0.0.1:8000/document/abc123')
  })

  it('résout procedureViewUrl depuis gpu.config', () => {
    setGpuClientConfigScriptUrl('http://127.0.0.1:8000/map/gpu-client-config.js')
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173/map'),
      writable: true,
    })
    config.procedureViewUrl = GPU_SITE_PROCEDURE_VIEW_URL
    config.urlPlaceholders = { procedureId: PROCEDURE_ID_PLACEHOLDER }

    expect(resolveGpuProcedureViewUrl('1060')).toBe('http://127.0.0.1:8000/procedure/view/1060')
  })

  it('MEC : ignore archiveUrl et ouvre la fiche document', () => {
    setGpuClientConfigScriptUrl('http://127.0.0.1:8000/map/gpu-client-config.js')
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173/map'),
      writable: true,
    })
    const id = '70988e89fab69afbbe73e04615b10d2e'
    expect(
      resolveMecDocumentTileHref({
        documentId: id,
        viewUrl: undefined,
      }),
    ).toBe(resolveGpuDocumentViewUrl(id))
    expect(
      resolveMecDocumentTileHref({
        documentId: id,
        viewUrl: `http://127.0.0.1:8000/api/document/${id}/download/file.zip`,
      }),
    ).toBe(resolveGpuDocumentViewUrl(id))
  })

  it('convertit procedureViewUrl proxifiée en lien gpu-site absolu', () => {
    setGpuClientConfigScriptUrl('http://127.0.0.1:8000/map/gpu-client-config.js')
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173/map'),
      writable: true,
    })
    config.procedureViewUrl = PROXY_PROCEDURE_VIEW_URL
    config.urlPlaceholders = { procedureId: PROCEDURE_ID_PLACEHOLDER }

    expect(resolveGpuProcedureViewUrl('1115')).toBe('http://127.0.0.1:8000/procedure/view/1115')
  })

  describe('tuiles document (gpu-site dsfr et main)', () => {
    const id = 'ff4c45ed9b7d91d35221dfed6db6d02c'
    const archiveUrl = `https://www.geoportail-urbanisme.gouv.fr/api/document/${id}/download/31526_PLU.zip`

    function onPagesWithMainConfig() {
      setGpuClientConfigScriptUrl(
        'https://www.geoportail-urbanisme.gouv.fr/map/gpu-client-config.js',
      )
      Object.defineProperty(window, 'location', {
        value: new URL('https://ignf.github.io/gpu-entree-carto/map'),
        writable: true,
      })
    }

    it('sans documentViewUrl (gpu-site main) : page document /document/by-id/{id}', () => {
      onPagesWithMainConfig()
      expect(resolveGpuDocumentViewUrl(id)).toBe(
        `https://www.geoportail-urbanisme.gouv.fr/document/by-id/${id}`,
      )
    })

    it('id + archiveUrl sans viewUrl : page du document, jamais le ZIP', () => {
      onPagesWithMainConfig()
      expect(resolveDocumentTileHref({ documentId: id, archiveUrl } as never)).toBe(
        `https://www.geoportail-urbanisme.gouv.fr/document/by-id/${id}`,
      )
    })

    it('archiveUrl seul : aucun lien', () => {
      onPagesWithMainConfig()
      expect(resolveDocumentTileHref({ archiveUrl } as never)).toBeUndefined()
    })

    it('viewUrl prioritaire', () => {
      onPagesWithMainConfig()
      expect(resolveDocumentTileHref({ documentId: id, viewUrl: `/document/${id}` })).toBe(
        `https://www.geoportail-urbanisme.gouv.fr/document/${id}`,
      )
    })

    it('documentViewUrl de la config (gpu-site dsfr) utilisé', () => {
      setGpuClientConfigScriptUrl('http://127.0.0.1:8000/map/gpu-client-config.js')
      Object.defineProperty(window, 'location', {
        value: new URL('http://localhost:5173/map'),
        writable: true,
      })
      config.documentViewUrl = '/document/__GPU_DOCUMENT_ID__'
      config.urlPlaceholders = { documentId: '__GPU_DOCUMENT_ID__' }
      expect(resolveGpuDocumentViewUrl(id)).toBe(`http://127.0.0.1:8000/document/${id}`)
    })
  })
})
