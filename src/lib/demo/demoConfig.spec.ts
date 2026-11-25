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
    expect(resolveDemoLayerNodes(cfg)).toEqual([])
  })

  it('fusionne window.DEMO_CONFIG', () => {
    window.DEMO_CONFIG = {
      map: { zoom: 10, layerNodes: [{ id: 'x', title: 'Test', visible: true }] },
    }
    const cfg = getDemoConfig()
    expect(cfg.map?.zoom).toBe(10)
    expect(resolveDemoLayerNodes(cfg)).toEqual([{ id: 'x', title: 'Test', visible: true }])
  })

  it('arbre du catalogue : visibilité de la layerConfig, sans surcharge par le document (appliqué au démarrage seulement sans permalink)', () => {
    const w = window as Window & { LAYER_CONFIG?: unknown }
    const prevLayerConfig = w.LAYER_CONFIG
    w.LAYER_CONFIG = [
      {
        name: 'lowscale',
        title: "VUE D'ENSEMBLE DES DOCUMENTS D'URBANISME",
        virtual: true,
        visible: true,
        layers: [{ name: 'municipality', title: 'Communes', visible: true }],
      },
      {
        name: 'sup',
        title: "SERVITUDE D'UTILITE PUBLIQUE",
        virtual: true,
        visible: false,
        layers: [{ name: 'ac4', title: 'AC4', visible: false }],
      },
    ]
    try {
      const nodes = resolveDemoLayerNodes({
        map: { zoom: 6 },
        document: { id: 'x', type: 'SUP', name: '172014607_SUP_18_AC4' },
      })
      const visibleByTitle = Object.fromEntries(nodes.map((n) => [n.title, n.visible]))
      expect(visibleByTitle).toEqual({
        "VUE D'ENSEMBLE DES DOCUMENTS D'URBANISME": true,
        "SERVITUDE D'UTILITE PUBLIQUE": false,
      })
    } finally {
      w.LAYER_CONFIG = prevLayerConfig
    }
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
