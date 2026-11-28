/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { createGpuBaseLayerEnvironment, setActiveGpuBaseLayer } from '@/ol/gpuBaseLayerPresets'

describe('fond de plan Cadastre : fond blanc sous les couches transparentes', () => {
  it('fond Cadastre : couches cadastre sur fond blanc (lisible en thème sombre)', () => {
    const env = createGpuBaseLayerEnvironment()
    setActiveGpuBaseLayer(env, 'cadastre')
    expect(env.mainLayers.cadastreLow.getBackground()).toBe('#ffffff')
    expect(env.mainLayers.cadastreHigh.getBackground()).toBe('#ffffff')
  })

  it('autre fond : cadastre bas zoom sans fond (ne masque pas le plan ou la photo dessous)', () => {
    const env = createGpuBaseLayerEnvironment()
    setActiveGpuBaseLayer(env, 'cadastre')
    setActiveGpuBaseLayer(env, 'photo')
    expect(env.mainLayers.cadastreLow.getBackground()).toBeUndefined()
  })
})
