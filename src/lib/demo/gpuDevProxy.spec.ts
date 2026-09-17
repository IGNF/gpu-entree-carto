import { describe, expect, it, vi } from 'vitest'
import { rewriteLocalGpuSiteUrl } from '@/lib/demo/gpuDevProxy'

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
})
