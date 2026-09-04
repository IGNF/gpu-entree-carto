/**
 * Monte une carte OpenLayers + SketchControl dans un conteneur HTML.
 * Bundle standalone : `entree-carto-sketch`.
 */
import Map from 'ol/Map'
import View from 'ol/View'
import { defaults as defaultControls } from 'ol/control'
import Zoom from 'ol/control/Zoom'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import { SketchControl, type SketchControlOptions } from '@/geometry-editor/SketchControl'
import type { TileLayerConfig } from '@/geometry-editor/types'

export interface MountSketchOptions extends SketchControlOptions {
  width?: string | number
  height?: string | number
  lon?: number
  lat?: number
  zoom?: number
  minZoom?: number
  maxZoom?: number
  tileLayers?: TileLayerConfig[]
  showZoom?: boolean
  className?: string
}

export interface MountSketchHandle {
  map: Map
  sketch: SketchControl
  destroy: () => void
}

const DEFAULT_TILE: TileLayerConfig = {
  title: 'Plan IGN',
  url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
  attribution: '© IGN — Géoplateforme',
  maxZoom: 19,
}

function cssSize(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

function createTileLayer(cfg: TileLayerConfig): TileLayer {
  return new TileLayer({
    source: new XYZ({
      url: cfg.url,
      attributions: cfg.attribution,
      maxZoom: cfg.maxZoom ?? 19,
    }),
    properties: { title: cfg.title ?? 'Fond' },
  })
}

/**
 * Crée une carte + SketchControl dans `target` (élément ou sélecteur).
 */
export function mountSketch(
  target: HTMLElement | string,
  options: MountSketchOptions = {},
): MountSketchHandle {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) {
    throw new Error('[entree-carto-sketch] élément introuvable')
  }

  const width = options.width ?? '100%'
  const height = options.height ?? 480
  const lon = options.lon ?? 2.0
  const lat = options.lat ?? 46.5
  const zoom = options.zoom ?? 5
  const minZoom = options.minZoom ?? 4
  const maxZoom = options.maxZoom ?? 19
  const tileLayers = options.tileLayers?.length ? options.tileLayers : [DEFAULT_TILE]
  const showZoom = options.showZoom !== false
  const toolsToggle = options.toolsToggle ?? 'top-left'

  el.classList.add('ec-sketch-mount')
  if (options.className) el.classList.add(options.className)
  el.style.position = 'relative'
  el.style.width = cssSize(width)
  el.style.height = cssSize(height)
  el.style.overflow = 'hidden'
  el.style.border = '1px solid var(--border-default-grey, #ddd)'
  el.style.borderRadius = '0.25rem'
  el.replaceChildren()

  const mapTarget = document.createElement('div')
  mapTarget.style.position = 'absolute'
  mapTarget.style.inset = '0'
  mapTarget.style.width = '100%'
  mapTarget.style.height = '100%'
  el.appendChild(mapTarget)

  const map = new Map({
    target: mapTarget,
    layers: tileLayers.map(createTileLayer),
    view: new View({
      center: fromLonLat([lon, lat]),
      zoom,
      minZoom,
      maxZoom,
    }),
    controls: defaultControls({ attribution: false, zoom: false }),
  })

  if (showZoom) {
    map.addControl(
      new Zoom({
        className: 'ol-zoom ol-unselectable ol-control',
        zoomInLabel: '+',
        zoomOutLabel: '−',
      }),
    )
  }

  const sketch = new SketchControl({
    geometryType: options.geometryType ?? 'Geometry',
    toolsToggle,
    clearAll: options.clearAll ?? true,
    history: options.history ?? true,
    localStorageKey:
      options.localStorageKey === undefined ? 'entree-carto-sketch' : options.localStorageKey,
    extraTools: options.extraTools ?? [
      'Text',
      'Import',
      'Export',
      'MeasureDistance',
      'MeasureArea',
    ],
    enableFeatureStyleEditor: options.enableFeatureStyleEditor ?? true,
    source: options.source,
    layer: options.layer,
    style: options.style,
    zIndex: options.zIndex,
    position: options.position,
    onChange: options.onChange,
  })
  map.addControl(sketch)

  return {
    map,
    sketch,
    destroy: () => {
      map.removeControl(sketch)
      map.setTarget(undefined)
      el.replaceChildren()
      el.classList.remove('ec-sketch-mount')
      if (options.className) el.classList.remove(options.className)
    },
  }
}
