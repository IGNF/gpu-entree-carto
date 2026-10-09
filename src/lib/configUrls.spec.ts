import { afterEach, describe, expect, it } from 'vitest'
import {
  resolveConfigUrl,
  resolveConfigUrlsInRecord,
  setGpuClientConfigScriptUrl,
} from '@/lib/configUrls'

describe('resolveConfigUrl', () => {
  afterEach(() => {
    setGpuClientConfigScriptUrl(null)
  })

  it('résout un chemin relatif par rapport au script gpu-client-config', () => {
    setGpuClientConfigScriptUrl('http://localhost:8000/map/gpu-client-config.js')
    expect(resolveConfigUrl('/build/gpu/images/map_legend/')).toBe(
      'http://localhost:8000/build/gpu/images/map_legend/',
    )
  })

  it('laisse une URL absolue inchangée', () => {
    setGpuClientConfigScriptUrl('http://localhost:8000/map/gpu-client-config.js')
    expect(resolveConfigUrl('https://example.com/legend/')).toBe('https://example.com/legend/')
  })
})

describe('resolveConfigUrlsInRecord', () => {
  afterEach(() => {
    setGpuClientConfigScriptUrl(null)
  })

  it('résout legendImageDetailDirectory', () => {
    setGpuClientConfigScriptUrl('http://127.0.0.1:8000/js/gpu-client-config.js')
    const cfg: Record<string, unknown> = {
      apiFicheInfoUrl: '/api/fiche-info',
      legendImageDetailDirectory: '/build/gpu/images/map_legend/',
    }
    resolveConfigUrlsInRecord(cfg)
    expect(cfg.legendImageDetailDirectory).toBe(
      'http://127.0.0.1:8000/build/gpu/images/map_legend/',
    )
    expect(cfg.apiFicheInfoUrl).toBe('http://127.0.0.1:8000/api/fiche-info')
  })
})
