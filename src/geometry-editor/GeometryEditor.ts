import Map from 'ol/Map'
import View from 'ol/View'
import { defaults as defaultControls } from 'ol/control'
import Zoom from 'ol/control/Zoom'
import Attribution from 'ol/control/Attribution'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import {
  DEFAULT_GEOMETRY_EDITOR_OPTIONS,
  type GeometryEditorOptions,
  type GeometryTypeOption,
} from './types'
import { parseRawToFeatures } from './parseGeometry'
import { serializeFeatures } from './serializeGeometry'
import { geometryStyleFunction } from './styles'
import { DrawToolsBar } from './DrawToolsBar'

function cssSize(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

function isFormField(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

/**
 * Éditeur de géométries rattaché à un champ / élément HTML
 * (remplacement DSFR d’ol-geometry-editor, OpenLayers embarqué).
 */
export class GeometryEditor {
  readonly element: HTMLElement
  readonly options: typeof DEFAULT_GEOMETRY_EDITOR_OPTIONS & GeometryEditorOptions
  readonly map: Map
  readonly source: VectorSource
  private readonly mapHost: HTMLElement
  private readonly toolbarHost: HTMLElement | null
  private drawBar: DrawToolsBar | null = null
  private syncingFromElement = false
  private destroyed = false
  private readonly onElementInput: () => void

  constructor(element: HTMLElement, options: GeometryEditorOptions = {}) {
    this.element = element
    this.options = {
      ...DEFAULT_GEOMETRY_EDITOR_OPTIONS,
      ...options,
      tileLayers:
        options.tileLayers?.length
          ? options.tileLayers
          : DEFAULT_GEOMETRY_EDITOR_OPTIONS.tileLayers,
    }

    if (this.options.hide) {
      element.hidden = true
      element.setAttribute('aria-hidden', 'true')
    }

    this.mapHost = document.createElement('div')
    this.mapHost.className = [
      'ec-geometry-editor',
      this.options.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    this.mapHost.style.width = cssSize(this.options.width)
    this.mapHost.style.height = cssSize(this.options.height)

    const mapTarget = document.createElement('div')
    mapTarget.className = 'ec-geometry-editor__map'
    this.mapHost.appendChild(mapTarget)

    if (this.options.editable) {
      this.toolbarHost = document.createElement('div')
      this.toolbarHost.className = 'ec-geometry-editor__toolbar'
      this.toolbarHost.setAttribute('role', 'toolbar')
      this.toolbarHost.setAttribute('aria-label', 'Outils de dessin')
      // Overlay dans la carte (pas sous la carte)
      this.mapHost.appendChild(this.toolbarHost)
    } else {
      this.toolbarHost = null
    }

    element.insertAdjacentElement('afterend', this.mapHost)

    this.source = new VectorSource({ wrapX: false })
    const vectorLayer = new VectorLayer({
      source: this.source,
      style: geometryStyleFunction,
    })

    const baseLayers = this.options.tileLayers.map(
      (cfg) =>
        new TileLayer({
          source: new XYZ({
            url: cfg.url,
            attributions: cfg.attribution,
            maxZoom: cfg.maxZoom ?? 19,
          }),
          properties: { title: cfg.title ?? 'Fond' },
        }),
    )

    this.map = new Map({
      target: mapTarget,
      layers: [...baseLayers, vectorLayer],
      view: new View({
        center: fromLonLat([this.options.lon, this.options.lat]),
        zoom: this.options.zoom,
        minZoom: this.options.minZoom,
        maxZoom: this.options.maxZoom,
      }),
      controls: defaultControls({ attribution: false, zoom: false }).extend([
        new Zoom(),
        new Attribution({ collapsible: false }),
      ]),
    })

    this.loadFromElement()

    if (this.options.editable && this.toolbarHost) {
      this.drawBar = new DrawToolsBar({
        map: this.map,
        source: this.source,
        layer: vectorLayer,
        geometryType: this.options.geometryType as GeometryTypeOption,
        target: this.toolbarHost,
        onChange: () => this.serializeToElement(),
      })
    }

    this.onElementInput = () => {
      if (this.syncingFromElement || this.destroyed) return
      this.loadFromElement()
    }
    element.addEventListener('input', this.onElementInput)
    element.addEventListener('change', this.onElementInput)
  }

  getMap(): Map {
    return this.map
  }

  getRawData(): string {
    if (isFormField(this.element)) {
      return (this.element as HTMLInputElement | HTMLTextAreaElement).value.trim()
    }
    return (this.element.textContent ?? '').trim()
  }

  setRawData(value: string): void {
    const current = this.getRawData()
    if (current === value) return
    this.syncingFromElement = true
    if (isFormField(this.element)) {
      ;(this.element as HTMLInputElement | HTMLTextAreaElement).value = value
      this.element.dispatchEvent(new Event('input', { bubbles: true }))
      this.element.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      this.element.textContent = value
    }
    this.syncingFromElement = false
  }

  loadFromElement(): void {
    const features = parseRawToFeatures(this.getRawData())
    this.source.clear(true)
    if (features.length) {
      this.source.addFeatures(features)
      if (this.options.centerOnResults) {
        this.fitToFeatures()
      }
    }
  }

  serializeToElement(): void {
    const features = this.source.getFeatures() as OlFeature<OlGeometry>[]
    const raw = serializeFeatures(features, {
      geometryType: this.options.geometryType as GeometryTypeOption,
      precision: this.options.precision,
      outputFormat: this.options.outputFormat,
    })
    this.setRawData(raw)
    // Événement custom (compat ol-geometry-editor : map.on('change:geometry'))
    this.map.dispatchEvent({ type: 'change:geometry', geometry: raw } as never)
  }

  fitToFeatures(): void {
    const extent = this.source.getExtent()
    if (!extent || !isFinite(extent[0])) return
    this.map.getView().fit(extent, {
      padding: [40, 40, 40, 40],
      maxZoom: Math.min(16, this.options.maxZoom),
      duration: 0,
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.element.removeEventListener('input', this.onElementInput)
    this.element.removeEventListener('change', this.onElementInput)
    this.drawBar?.destroy()
    this.map.setTarget(undefined)
    this.mapHost.remove()
    if (this.options.hide) {
      this.element.hidden = false
      this.element.removeAttribute('aria-hidden')
    }
  }
}
