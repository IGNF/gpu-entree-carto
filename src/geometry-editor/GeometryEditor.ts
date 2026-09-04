import Map from 'ol/Map'
import View from 'ol/View'
import { defaults as defaultControls } from 'ol/control'
import Zoom from 'ol/control/Zoom'
import Attribution from 'ol/control/Attribution'
import { defaults as defaultInteractions } from 'ol/interaction'
import DragPan from 'ol/interaction/DragPan'
import DragRotate from 'ol/interaction/DragRotate'
import DragZoom from 'ol/interaction/DragZoom'
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom'
import KeyboardPan from 'ol/interaction/KeyboardPan'
import KeyboardZoom from 'ol/interaction/KeyboardZoom'
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom'
import PinchRotate from 'ol/interaction/PinchRotate'
import PinchZoom from 'ol/interaction/PinchZoom'
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
  type TileLayerConfig,
  type ToolsToggleCorner,
} from './types'
import { parseRawToFeatures } from './parseGeometry'
import { serializeFeatures } from './serializeGeometry'
import { geometryStyleFunction } from './styles'
import { SketchControl } from './SketchControl'
import { SettingsPanel } from './SettingsPanel'
import { restoreCircleFeaturesForKind } from './circleHelpers'
import { parseGeometryTypes, primaryGeometryType } from './geometryTypeUtils'

type ResolvedOptions = typeof DEFAULT_GEOMETRY_EDITOR_OPTIONS & GeometryEditorOptions

function cssSize(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

function isFormField(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

function mergeOptions(current: ResolvedOptions, patch: GeometryEditorOptions): ResolvedOptions {
  return {
    ...current,
    ...patch,
    tileLayers:
      patch.tileLayers !== undefined
        ? patch.tileLayers.length
          ? patch.tileLayers
          : DEFAULT_GEOMETRY_EDITOR_OPTIONS.tileLayers
        : current.tileLayers,
    customStyle: patch.customStyle === undefined ? current.customStyle : patch.customStyle,
  }
}

function cloneResolvedOptions(opts: ResolvedOptions): ResolvedOptions {
  return {
    ...opts,
    tileLayers: opts.tileLayers.map((layer) => ({ ...layer })),
  }
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

function isNavigationInteraction(interaction: unknown): boolean {
  return (
    interaction instanceof DragPan ||
    interaction instanceof DragRotate ||
    interaction instanceof DragZoom ||
    interaction instanceof DoubleClickZoom ||
    interaction instanceof KeyboardPan ||
    interaction instanceof KeyboardZoom ||
    interaction instanceof MouseWheelZoom ||
    interaction instanceof PinchRotate ||
    interaction instanceof PinchZoom
  )
}

/** jQuery optionnel (gpu-site) — typage minimal pour .on / .off. */
function getJQuery():
  | ((el: HTMLElement) => {
      on: (events: string, handler: () => void) => void
      off: (events: string) => void
    })
  | null {
  const w = window as Window & {
    jQuery?: (el: HTMLElement) => {
      on: (events: string, handler: () => void) => void
      off: (events: string) => void
    }
    $?: (el: HTMLElement) => {
      on: (events: string, handler: () => void) => void
      off: (events: string) => void
    }
  }
  const jq = w.jQuery ?? w.$
  return typeof jq === 'function' ? jq : null
}

/**
 * Éditeur de géométries rattaché à un champ / élément HTML
 * (remplacement DSFR d’ol-geometry-editor, OpenLayers embarqué).
 */
export class GeometryEditor {
  readonly element: HTMLElement
  options: ResolvedOptions
  /** Options résolues au chargement (pour réinitialisation). */
  private readonly initialOptions: ResolvedOptions
  readonly map: Map
  readonly source: VectorSource
  private readonly mapHost: HTMLElement
  private readonly vectorLayer: VectorLayer
  private zoomControl: Zoom | null = null
  private attributionControl: Attribution | null = null
  private settingsPanel: SettingsPanel | null = null
  private sketch: SketchControl | null = null
  private syncingFromElement = false
  private destroyed = false
  private jqueryListening = false
  /** Évite un double load si listeners natif + jQuery voient le même événement. */
  private lastLoadedRaw: string | null = null
  private readonly onElementInput: () => void

  constructor(element: HTMLElement, options: GeometryEditorOptions = {}) {
    this.element = element
    this.options = mergeOptions({ ...DEFAULT_GEOMETRY_EDITOR_OPTIONS }, options)
    this.initialOptions = cloneResolvedOptions(this.options)

    this.applyElementVisibility()

    this.mapHost = document.createElement('div')
    this.applyHostClass()
    this.applyHostSize()

    const mapTarget = document.createElement('div')
    mapTarget.className = 'ec-geometry-editor__map'
    this.mapHost.appendChild(mapTarget)

    element.insertAdjacentElement('afterend', this.mapHost)

    this.source = new VectorSource({ wrapX: false })
    this.vectorLayer = new VectorLayer({
      source: this.source,
      style: this.options.customStyle ?? geometryStyleFunction,
    })

    const baseLayers = this.options.tileLayers.map(createTileLayer)

    const controls = defaultControls({ attribution: false, zoom: false })

    const blockView = this.options.blockView
    this.map = new Map({
      target: mapTarget,
      layers: [...baseLayers, this.vectorLayer],
      view: new View({
        center: fromLonLat([this.options.lon, this.options.lat]),
        zoom: this.options.zoom,
        minZoom: this.options.minZoom,
        maxZoom: this.options.maxZoom,
      }),
      controls,
      interactions: defaultInteractions({
        altShiftDragRotate: !blockView,
        doubleClickZoom: !blockView,
        keyboard: !blockView,
        mouseWheelZoom: !blockView,
        shiftDragZoom: !blockView,
        dragPan: !blockView,
        pinchRotate: !blockView,
        pinchZoom: !blockView,
      }),
    })

    this.applyShowZoom()
    this.applyShowAttributions()
    this.applyShowSettings()
    this.loadFromElement()
    this.applyEditable()

    this.onElementInput = () => {
      if (this.syncingFromElement || this.destroyed) return
      this.loadFromElement()
    }
    this.bindElementListeners()
  }

  /**
   * Écoute native + pont jQuery : gpu-site fait souvent
   * `$field.val(x).trigger('change')`, qui ne notifie pas addEventListener.
   */
  private bindElementListeners(): void {
    this.element.addEventListener('input', this.onElementInput)
    this.element.addEventListener('change', this.onElementInput)
    const jq = getJQuery()
    if (jq) {
      jq(this.element).on('input.ecGeometryEditor change.ecGeometryEditor', this.onElementInput)
      this.jqueryListening = true
    }
  }

  private unbindElementListeners(): void {
    this.element.removeEventListener('input', this.onElementInput)
    this.element.removeEventListener('change', this.onElementInput)
    if (this.jqueryListening) {
      const jq = getJQuery()
      if (jq) {
        jq(this.element).off('.ecGeometryEditor')
      }
      this.jqueryListening = false
    }
  }

  /**
   * Met à jour les options à chaud (carte déjà créée).
   * Seules les clés présentes dans `patch` sont modifiées.
   */
  setOptions(patch: GeometryEditorOptions): void {
    if (this.destroyed) return
    const prev = this.options
    this.options = mergeOptions(prev, patch)

    if (patch.width !== undefined || patch.height !== undefined) {
      this.applyHostSize()
      this.map.updateSize()
    }

    if (
      patch.className !== undefined ||
      patch.blockView !== undefined ||
      patch.showSettings !== undefined
    ) {
      this.applyHostClass()
    }

    if (patch.hide !== undefined) {
      this.applyElementVisibility()
    }

    if (
      patch.lon !== undefined ||
      patch.lat !== undefined ||
      patch.zoom !== undefined ||
      patch.minZoom !== undefined ||
      patch.maxZoom !== undefined
    ) {
      this.applyView(patch)
    }

    if (patch.blockView !== undefined) {
      this.applyBlockView(this.options.blockView)
    }

    if (patch.showZoom !== undefined || patch.blockView !== undefined) {
      this.applyShowZoom()
    }

    if (patch.showAttributions !== undefined) {
      this.applyShowAttributions()
    }

    if (patch.showSettings !== undefined) {
      this.applyShowSettings()
    }

    if (patch.tileLayers !== undefined) {
      this.applyTileLayers(this.options.tileLayers)
    }

    if (patch.customStyle !== undefined) {
      this.vectorLayer.setStyle(this.options.customStyle ?? geometryStyleFunction)
      this.sketch?.setStyle(this.options.customStyle)
    }

    if (patch.editable !== undefined) {
      this.applyEditable()
    } else if (patch.toolsToggle !== undefined) {
      this.applyHostClass()
      this.sketch?.setToolsToggle((this.options.toolsToggle as ToolsToggleCorner | null) ?? null)
    } else if (
      this.sketch &&
      patch.geometryType !== undefined &&
      patch.geometryType !== prev.geometryType
    ) {
      this.sketch.setGeometryType(this.options.geometryType as GeometryTypeOption)
    }

    if (
      patch.geometryType !== undefined ||
      patch.outputFormat !== undefined ||
      patch.precision !== undefined
    ) {
      this.serializeToElement()
    }
  }

  getOptions(): Readonly<ResolvedOptions> {
    return this.options
  }

  /** Options présentes au chargement de l’éditeur. */
  getInitialOptions(): Readonly<ResolvedOptions> {
    return this.initialOptions
  }

  /**
   * Remet toutes les options aux valeurs du chargement initial
   * (celles passées à `mountGeometryEditor` / constructeur, fusionnées aux défauts).
   */
  resetOptions(): void {
    if (this.destroyed) return
    this.setOptions(cloneResolvedOptions(this.initialOptions))
  }

  getMap(): Map {
    return this.map
  }

  /** Couche vecteur d’édition (compat ShowGridOnMinimap). */
  getGeometryLayer(): VectorLayer {
    return this.vectorLayer
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
    const raw = this.getRawData()
    if (raw === this.lastLoadedRaw) return
    this.lastLoadedRaw = raw
    let features = parseRawToFeatures(raw)
    const primary = primaryGeometryType(parseGeometryTypes(this.options.geometryType))
    if (primary === 'Circle' || primary === 'MultiCircle') {
      features = restoreCircleFeaturesForKind(features, 'circle')
    } else if (primary === 'Disc' || primary === 'MultiDisc') {
      features = restoreCircleFeaturesForKind(features, 'disc')
    }
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
    this.lastLoadedRaw = raw
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
    this.unbindElementListeners()
    if (this.sketch) {
      this.map.removeControl(this.sketch)
      this.sketch = null
    }
    this.settingsPanel?.destroy()
    this.settingsPanel = null
    this.map.setTarget(undefined)
    this.mapHost.remove()
    if (this.options.hide) {
      this.showSourceElement()
    }
  }

  private applyHostClass(): void {
    const corner = this.options.toolsToggle
    this.mapHost.className = [
      'ec-geometry-editor',
      this.options.blockView ? 'ec-geometry-editor--block-view' : '',
      this.options.showSettings ? 'ec-geometry-editor--has-settings' : '',
      corner ? `ec-geometry-editor--tools-toggle-${corner}` : '',
      this.options.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  private applyHostSize(): void {
    this.mapHost.style.width = cssSize(this.options.width)
    this.mapHost.style.height = cssSize(this.options.height)
  }

  private applyElementVisibility(): void {
    if (this.options.hide) {
      this.hideSourceElement()
    } else {
      this.showSourceElement()
    }
  }

  /**
   * Masque le champ source. L’attribut HTML `hidden` seul ne suffit pas :
   * DSFR `.fr-input` impose un `display` auteur qui écrase la feuille UA de `[hidden]`.
   */
  private hideSourceElement(): void {
    this.element.hidden = true
    this.element.setAttribute('aria-hidden', 'true')
    this.element.classList.add('ec-geometry-editor-source--hidden', 'fr-hidden')
  }

  private showSourceElement(): void {
    this.element.hidden = false
    this.element.removeAttribute('aria-hidden')
    this.element.classList.remove('ec-geometry-editor-source--hidden', 'fr-hidden')
  }

  private applyView(patch: GeometryEditorOptions): void {
    const view = this.map.getView()
    if (patch.lon !== undefined || patch.lat !== undefined) {
      const next = fromLonLat([this.options.lon, this.options.lat])
      const cur = view.getCenter()
      if (!cur || Math.abs(cur[0] - next[0]) > 1e-3 || Math.abs(cur[1] - next[1]) > 1e-3) {
        view.setCenter(next)
      }
    }
    if (patch.zoom !== undefined) {
      const curZoom = view.getZoom()
      if (curZoom === undefined || Math.abs(curZoom - this.options.zoom) > 1e-4) {
        view.setZoom(this.options.zoom)
      }
    }
    if (patch.minZoom !== undefined) {
      view.setMinZoom(this.options.minZoom)
    }
    if (patch.maxZoom !== undefined) {
      view.setMaxZoom(this.options.maxZoom)
    }
  }

  private applyBlockView(blocked: boolean): void {
    this.map.getInteractions().forEach((interaction) => {
      if (isNavigationInteraction(interaction)) {
        interaction.setActive(!blocked)
      }
    })
  }

  private applyShowZoom(): void {
    const want = this.options.showZoom && !this.options.blockView
    if (want && !this.zoomControl) {
      this.zoomControl = new Zoom()
      this.map.addControl(this.zoomControl)
    } else if (!want && this.zoomControl) {
      this.map.removeControl(this.zoomControl)
      this.zoomControl = null
    }
  }

  private applyShowAttributions(): void {
    const want = this.options.showAttributions
    if (want && !this.attributionControl) {
      this.attributionControl = new Attribution({ collapsible: false })
      this.map.addControl(this.attributionControl)
    } else if (!want && this.attributionControl) {
      this.map.removeControl(this.attributionControl)
      this.attributionControl = null
    }
  }

  private applyShowSettings(): void {
    const want = this.options.showSettings
    if (want && !this.settingsPanel) {
      this.settingsPanel = new SettingsPanel(this, this.mapHost)
    } else if (!want && this.settingsPanel) {
      this.settingsPanel.destroy()
      this.settingsPanel = null
    }
    this.applyHostClass()
  }

  private applyTileLayers(configs: TileLayerConfig[]): void {
    const layers = this.map.getLayers()
    const existing = layers.getArray().filter((l) => l instanceof TileLayer)
    for (const layer of existing) {
      layers.remove(layer)
    }
    configs.forEach((cfg, index) => {
      layers.insertAt(index, createTileLayer(cfg))
    })
  }

  private applyEditable(): void {
    if (this.options.editable) {
      if (!this.sketch) {
        this.sketch = new SketchControl({
          geometryType: this.options.geometryType as GeometryTypeOption,
          toolsToggle: (this.options.toolsToggle as ToolsToggleCorner | null) ?? null,
          source: this.source,
          layer: this.vectorLayer,
          style: this.options.customStyle,
          // GeometryEditor : pas de localStorage / clearAll / extraTools
          onChange: () => this.serializeToElement(),
        })
        this.map.addControl(this.sketch)
        // Comme avant SketchControl : chrome sur le host, pas dans l’overlay OL
        this.mapHost.appendChild(this.sketch.getElement())
      } else {
        this.sketch.setGeometryType(this.options.geometryType as GeometryTypeOption)
        this.sketch.setToolsToggle((this.options.toolsToggle as ToolsToggleCorner | null) ?? null)
        this.sketch.setStyle(this.options.customStyle)
      }
      this.applyHostClass()
    } else if (this.sketch) {
      this.map.removeControl(this.sketch)
      this.sketch = null
      this.applyHostClass()
    }
  }
}
