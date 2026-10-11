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

describe('ficheGpuSiteUrls', () => {
  afterEach(() => {
    setGpuClientConfigScriptUrl(null)
    delete config.procedureViewUrl
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
    config.procedureViewUrl = 'http://127.0.0.1:8000/procedure/view/__GPU_PROCEDURE_ID__'
    config.urlPlaceholders = { procedureId: '__GPU_PROCEDURE_ID__' }

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
    config.procedureViewUrl = '/__gpu_dev_proxy__/procedure/view/__GPU_PROCEDURE_ID__'
    config.urlPlaceholders = { procedureId: '__GPU_PROCEDURE_ID__' }

    expect(resolveGpuProcedureViewUrl('1115')).toBe('http://127.0.0.1:8000/procedure/view/1115')
  })
})
