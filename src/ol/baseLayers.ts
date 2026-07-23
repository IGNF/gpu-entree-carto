import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import type BaseLayer from 'ol/layer/Base'

export type BaseLayerId = 'plan' | 'ortho' | 'blank'

export interface BaseLayerPreset {
  id: BaseLayerId
  label: string
  layer: BaseLayer
}

/**
 * Fonds de plan de démonstration (tuiles publiques IGN / fond blanc).
 * À remplacer plus tard par les couches Géoplateforme / geopf-extensions.
 */
export function createBaseLayerPresets(): BaseLayerPreset[] {
  const plan = new TileLayer({
    properties: { id: 'plan', title: 'Plan IGN' },
    source: new XYZ({
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attributions: '© IGN — Géoplateforme',
      maxZoom: 19,
    }),
  })

  const ortho = new TileLayer({
    visible: false,
    properties: { id: 'ortho', title: 'Photographies aériennes' },
    source: new XYZ({
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attributions: '© IGN — Géoplateforme',
      maxZoom: 19,
    }),
  })

  const blank = new VectorLayer({
    visible: false,
    properties: { id: 'blank', title: 'Fond blanc' },
    source: new VectorSource(),
    background: '#ffffff',
  })

  return [
    { id: 'plan', label: 'Plan IGN', layer: plan },
    { id: 'ortho', label: 'Ortho', layer: ortho },
    { id: 'blank', label: 'Blanc', layer: blank },
  ]
}

export function setActiveBaseLayer(presets: BaseLayerPreset[], id: BaseLayerId): void {
  for (const preset of presets) {
    preset.layer.setVisible(preset.id === id)
  }
}
