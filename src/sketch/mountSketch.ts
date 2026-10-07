/**
 * Monte une carte OpenLayers + SketchControl dans un conteneur HTML.
 * Bundle standalone : `entree-carto-sketch`.
 */
import '@/geometry-editor/styles/geometry-editor.css'
import Map from 'ol/Map'
import View from 'ol/View'
import { defaults as defaultControls } from 'ol/control'
import Zoom from 'ol/control/Zoom'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import { SketchControl, type SketchControlOptions } from '@/geometry-editor/SketchControl'
import type { TileLayerConfig, ToolsToggleCorner } from '@/geometry-editor/types'
import {
  SketchSettingsPanel,
  type ResolvedMountSketchOptions,
  type SketchSettingsHost,
} from './SketchSettingsPanel'

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
  /** Bouton roue crantée (haut droite) : formulaire d’options à chaud. */
  showSettings?: boolean
  className?: string
}

export interface MountSketchHandle {
  map: Map
  sketch: SketchControl
  getOptions(): Readonly<ResolvedMountSketchOptions>
  setOptions(patch: Partial<MountSketchOptions>): void
  resetOptions(): void
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

function resolveMountOptions(options: MountSketchOptions): ResolvedMountSketchOptions {
  const toolsToggle =
    options.toolsToggle === undefined ? ('top-left' as ToolsToggleCorner) : options.toolsToggle
  return {
    ...options,
    width: options.width ?? '100%',
    height: options.height ?? 480,
    lon: options.lon ?? 2.0,
    lat: options.lat ?? 46.5,
    zoom: options.zoom ?? 5,
    minZoom: options.minZoom ?? 4,
    maxZoom: options.maxZoom ?? 19,
    showZoom: options.showZoom !== false,
    showSettings: Boolean(options.showSettings),
    toolsToggle,
    geometryType: options.geometryType ?? 'Geometry',
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
    zIndex: options.zIndex ?? 500,
    tileLayers: options.tileLayers?.length ? options.tileLayers : [DEFAULT_TILE],
  }
}

/**
 * Crée une carte + SketchControl dans `target` (élément ou sélecteur).
 */
export function mountSketch(
  target: HTMLElement | string,
  options: MountSketchOptions = {},
): MountSketchHandle {
  const found = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!found) {
    throw new Error('[entree-carto-sketch] élément introuvable')
  }
  const mapHost = found

  let resolved = resolveMountOptions(options)
  const initialOptions = resolveMountOptions(options)

  mapHost.classList.add('ec-sketch-mount')
  if (options.className) mapHost.classList.add(options.className)
  applyHostSize(mapHost, resolved)
  mapHost.style.position = 'relative'
  mapHost.style.overflow = 'hidden'
  mapHost.style.border = '1px solid var(--border-default-grey, #ddd)'
  mapHost.style.borderRadius = '0.25rem'
  mapHost.replaceChildren()

  const mapTarget = document.createElement('div')
  mapTarget.style.position = 'absolute'
  mapTarget.style.inset = '0'
  mapTarget.style.width = '100%'
  mapTarget.style.height = '100%'
  mapHost.appendChild(mapTarget)

  const map = new Map({
    target: mapTarget,
    layers: resolved.tileLayers!.map(createTileLayer),
    view: new View({
      center: fromLonLat([resolved.lon, resolved.lat]),
      zoom: resolved.zoom,
      minZoom: resolved.minZoom,
      maxZoom: resolved.maxZoom,
    }),
    controls: defaultControls({ attribution: false, zoom: false }),
  })

  let zoomControl: Zoom | null = null

  const sketch = new SketchControl({
    geometryType: resolved.geometryType,
    toolsToggle: resolved.toolsToggle,
    clearAll: resolved.clearAll,
    history: resolved.history,
    localStorageKey: resolved.localStorageKey,
    extraTools: resolved.extraTools,
    enableFeatureStyleEditor: resolved.enableFeatureStyleEditor,
    source: options.source,
    layer: options.layer,
    style: options.style,
    zIndex: resolved.zIndex,
    position: options.position,
    onChange: options.onChange,
    onSketchEngagementChange: options.onSketchEngagementChange,
  })
  map.addControl(sketch)

  let settingsPanel: SketchSettingsPanel | null = null

  function applyHostClasses(): void {
    mapHost.classList.toggle('ec-sketch-mount--has-settings', resolved.showSettings)
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      mapHost.classList.remove(`ec-sketch-mount--tools-toggle-${corner}`)
    }
    if (resolved.toolsToggle) {
      mapHost.classList.add(`ec-sketch-mount--tools-toggle-${resolved.toolsToggle}`)
    }
  }

  function applyZoom(): void {
    if (zoomControl) {
      map.removeControl(zoomControl)
      zoomControl = null
    }
    if (resolved.showZoom) {
      zoomControl = new Zoom()
      map.addControl(zoomControl)
    }
  }

  function applyView(patch: Partial<MountSketchOptions>): void {
    const view = map.getView()
    if (patch.minZoom !== undefined) view.setMinZoom(resolved.minZoom)
    if (patch.maxZoom !== undefined) view.setMaxZoom(resolved.maxZoom)
    if (patch.lon !== undefined || patch.lat !== undefined || patch.zoom !== undefined) {
      view.setCenter(fromLonLat([resolved.lon, resolved.lat]))
      view.setZoom(resolved.zoom)
    }
  }

  function applySettingsPanel(): void {
    if (resolved.showSettings && !settingsPanel) {
      settingsPanel = new SketchSettingsPanel(host, mapHost)
    } else if (!resolved.showSettings && settingsPanel) {
      settingsPanel.destroy()
      settingsPanel = null
    }
  }

  const host: SketchSettingsHost = {
    getOptions: () => resolved,
    getInitialOptions: () => initialOptions,
    getMap: () => map,
    setOptions(patch) {
      setOptions(patch)
    },
    resetOptions() {
      resetOptions()
    },
  }

  function setOptions(patch: Partial<MountSketchOptions>): void {
    const prev = resolved
    resolved = resolveMountOptions({ ...resolved, ...patch })

    if (patch.width !== undefined || patch.height !== undefined) {
      applyHostSize(mapHost, resolved)
      map.updateSize()
    }

    if (
      patch.showSettings !== undefined ||
      patch.toolsToggle !== undefined ||
      patch.toolsToggle === null
    ) {
      applyHostClasses()
    }

    if (patch.showSettings !== undefined) {
      applySettingsPanel()
    }

    if (patch.showZoom !== undefined) {
      applyZoom()
    }

    if (
      patch.lon !== undefined ||
      patch.lat !== undefined ||
      patch.zoom !== undefined ||
      patch.minZoom !== undefined ||
      patch.maxZoom !== undefined
    ) {
      applyView(patch)
    }

    if (patch.geometryType !== undefined && patch.geometryType !== prev.geometryType) {
      sketch.setGeometryType(resolved.geometryType)
    }

    if (patch.toolsToggle !== undefined || patch.toolsToggle === null) {
      sketch.setToolsToggle(resolved.toolsToggle)
    }

    if (patch.style !== undefined) {
      sketch.setStyle(patch.style)
    }

    if (
      patch.clearAll !== undefined ||
      patch.history !== undefined ||
      patch.extraTools !== undefined ||
      patch.enableFeatureStyleEditor !== undefined ||
      patch.localStorageKey !== undefined ||
      patch.zIndex !== undefined
    ) {
      sketch.setRuntimeOptions({
        clearAll: resolved.clearAll,
        history: resolved.history,
        extraTools: resolved.extraTools,
        enableFeatureStyleEditor: resolved.enableFeatureStyleEditor,
        localStorageKey: resolved.localStorageKey,
        zIndex: resolved.zIndex,
      })
    }
  }

  function resetOptions(): void {
    setOptions({
      ...initialOptions,
      extraTools: [...initialOptions.extraTools],
    })
  }

  applyHostClasses()
  applyZoom()
  applySettingsPanel()

  return {
    map,
    sketch,
    getOptions: () => resolved,
    setOptions,
    resetOptions,
    destroy: () => {
      settingsPanel?.destroy()
      settingsPanel = null
      map.removeControl(sketch)
      if (zoomControl) map.removeControl(zoomControl)
      map.setTarget(undefined)
      mapHost.replaceChildren()
      mapHost.classList.remove('ec-sketch-mount', 'ec-sketch-mount--has-settings')
      for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
        mapHost.classList.remove(`ec-sketch-mount--tools-toggle-${corner}`)
      }
      if (options.className) mapHost.classList.remove(options.className)
    },
  }
}

function applyHostSize(el: HTMLElement, opts: ResolvedMountSketchOptions): void {
  el.style.width = cssSize(opts.width)
  el.style.height = cssSize(opts.height)
}
