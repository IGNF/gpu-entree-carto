import { describe, expect, it, vi } from 'vitest'
import { gpuSiteNavigationUrlFromProxy, rewriteLocalGpuSiteUrl } from '@/lib/demo/gpuDevProxy'

describe('rewriteLocalGpuSiteUrl', () => {
  it('laisse les URLs inchangées hors dev', () => {
    vi.stubEnv('DEV', false)
    expect(rewriteLocalGpuSiteUrl('http://127.0.0.1:8000/build/x.png')).toBe(
      'http://127.0.0.1:8000/build/x.png',
    )
    vi.unstubAllEnvs()
  })

  it('réécrit gpu-site local en dev', () => {
    vi.stubEnv('DEV', true)
    expect(rewriteLocalGpuSiteUrl('http://127.0.0.1:8000/build/gpu/images/map_legend/')).toBe(
      '/__gpu_dev_proxy__/build/gpu/images/map_legend/',
    )
    vi.unstubAllEnvs()
  })

  it('ne réécrit pas une URL déjà proxifiée', () => {
    vi.stubEnv('DEV', true)
    expect(rewriteLocalGpuSiteUrl('/__gpu_dev_proxy__/api/fiche-info-v2/parcelle')).toBe(
      '/__gpu_dev_proxy__/api/fiche-info-v2/parcelle',
    )
    vi.unstubAllEnvs()
  })

  it('normalise gpu-site avec segments proxy en trop', () => {
    vi.stubEnv('DEV', true)
    expect(
      rewriteLocalGpuSiteUrl('http://127.0.0.1:8000/__gpu_dev_proxy__/api/fiche-info-v2'),
    ).toBe('/__gpu_dev_proxy__/api/fiche-info-v2')
    vi.unstubAllEnvs()
  })

  it('convertit un chemin proxy en URL gpu-site pour la navigation', () => {
    document.body.innerHTML =
      '<script id="gpu-client-config" src="http://127.0.0.1:8000/map/gpu-client-config.js"></script>'
    expect(gpuSiteNavigationUrlFromProxy('/__gpu_dev_proxy__/procedure/view/1115')).toBe(
      'http://127.0.0.1:8000/procedure/view/1115',
    )
    document.body.innerHTML = ''
  })
})
