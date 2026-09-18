import { describe, expect, it, afterEach } from 'vitest'
import {
  getDemoConfig,
  isValidBbox,
  resolveDemoBaseLayerId,
  resolveDemoLayerNodes,
} from '@/lib/demo/demoConfig'

describe('demoConfig', () => {
  const prev = globalThis.window?.DEMO_CONFIG

  afterEach(() => {
    if (prev === undefined) {
      delete (window as Window & { DEMO_CONFIG?: unknown }).DEMO_CONFIG
    } else {
      window.DEMO_CONFIG = prev
    }
  })

  it('retourne les valeurs par défaut sans window.DEMO_CONFIG', () => {
    delete (window as Window & { DEMO_CONFIG?: unknown }).DEMO_CONFIG
    const cfg = getDemoConfig()
    expect(cfg.map?.zoom).toBe(6)
    expect(cfg.map?.baseLayerId).toBe('carte')
    expect(resolveDemoBaseLayerId(cfg)).toBe('carte')
    expect(resolveDemoLayerNodes(cfg).length).toBeGreaterThan(0)
  })

  it('fusionne window.DEMO_CONFIG', () => {
    window.DEMO_CONFIG = {
      map: { zoom: 10, layerNodes: [{ id: 'x', title: 'Test', visible: true }] },
    }
    const cfg = getDemoConfig()
    expect(cfg.map?.zoom).toBe(10)
    expect(resolveDemoLayerNodes(cfg)).toEqual([{ id: 'x', title: 'Test', visible: true }])
  })

  it('mappe les anciens ids de fond plan/ortho', () => {
    expect(resolveDemoBaseLayerId({ map: { baseLayerId: 'plan' } })).toBe('carte')
    expect(resolveDemoBaseLayerId({ map: { baseLayerId: 'ortho' } })).toBe('photo')
  })

  it('valide une bbox', () => {
    expect(isValidBbox([1, 2, 3, 4])).toBe(true)
    expect(isValidBbox([1, 2, 3])).toBe(false)
  })
})
