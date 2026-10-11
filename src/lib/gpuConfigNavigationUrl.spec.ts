/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import { setGpuClientConfigScriptUrl } from '@/lib/configUrls'
import { gpuNavigationUrlFromConfigTemplate } from '@/lib/gpuConfigNavigationUrl'
import { resolveGpuProcedureViewUrl } from '@/lib/fiche/ficheGpuSiteUrls'

describe('gpuConfigNavigationUrl', () => {
  afterEach(() => {
    setGpuClientConfigScriptUrl(null)
    delete config.documentViewUrl
    delete config.procedureViewUrl
    delete config.urlPlaceholders
  })

  it('substitue procedureId sans corrompre l’hôte 127.0.0.1', () => {
    setGpuClientConfigScriptUrl('http://127.0.0.1:8000/map/gpu-client-config.js')
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173/map'),
      writable: true,
    })
    config.procedureViewUrl = 'http://127.0.0.1:8000/procedure/view/0'
    config.urlPlaceholders = { procedureId: '0' }

    expect(resolveGpuProcedureViewUrl('1115')).toBe('http://127.0.0.1:8000/procedure/view/1115')
  })

  it('substitue le placeholder __GPU_PROCEDURE_ID__', () => {
    config.procedureViewUrl = '/procedure/view/__GPU_PROCEDURE_ID__'
    config.urlPlaceholders = { procedureId: '__GPU_PROCEDURE_ID__' }

    expect(gpuNavigationUrlFromConfigTemplate('procedureViewUrl', 'procedureId', '1115')).toContain(
      '/procedure/view/1115',
    )
  })

  it('substitue documentId dans documentViewUrl', () => {
    config.documentViewUrl = '/document/00000000000000000000000000000000'
    config.urlPlaceholders = { documentId: '00000000000000000000000000000000' }

    expect(gpuNavigationUrlFromConfigTemplate('documentViewUrl', 'documentId', 'abc123')).toContain(
      '/document/abc123',
    )
  })
})
