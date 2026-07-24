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
import { DrawToolsBar } from './DrawToolsBar'
import { SettingsPanel } from './SettingsPanel'
import { restoreCircleFeaturesForKind } from './circleHelpers'
import {
  parseGeometryTypes,
  primaryGeometryType,
} from './geometryTypeUtils'

type ResolvedOptions = typeof DEFAULT_GEOMETRY_EDITOR_OPTIONS &
  GeometryEditorOptions

function cssSize(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

function isFormField(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

function mergeOptions(
  current: ResolvedOptions,
  patch: GeometryEditorOptions,
): ResolvedOptions {
  return {
    ...current,
    ...patch,
    tileLayers:
      patch.tileLayers !== undefined
        ? patch.tileLayers.length
          ? patch.tileLayers
          : DEFAULT_GEOMETRY_EDITOR_OPTIONS.tileLayers
        : current.tileLayers,
    customStyle:
      patch.customStyle === undefined
        ? current.customStyle
        : patch.customStyle,
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
  /** Conteneur positionné (coin ou gauche) des contrôles d’édition. */
  private toolsRoot: HTMLElement | null = null
  /** Barre des outils de dessin (cible de DrawToolsBar). */
  private toolbarHost: HTMLElement | null = null
  private toolsToggleBtn: HTMLButtonElement | null = null
  private toolsMenuOpen = false
  private readonly toolbarDomId = `ec-geom-toolbar-${Math.random().toString(36).slice(2, 9)}`
  private zoomControl: Zoom | null = null
  private attributionControl: Attribution | null = null
  private settingsPanel: SettingsPanel | null = null
  private drawBar: DrawToolsBar | null = null
  private syncingFromElement = false
  private destroyed = false
  private readonly onElementInput: () => void

  constructor(element: HTMLElement, options: GeometryEditorOptions = {}) {
    this.element = element
    this.options = mergeOptions(
      { ...DEFAULT_GEOMETRY_EDITOR_OPTIONS },
      options,
    )
    this.initialOptions = cloneResolvedOptions(this.options)

    this.applyElementVisibility()

    this.mapHost = document.createElement('div')
    this.applyHostClass()
    this.applyHostSize()

    const mapTarget = document.createElement('div')
    mapTarget.className = 'ec-geometry-editor__map'
    this.mapHost.appendChild(mapTarget)

    this.toolsRoot = null
    this.toolbarHost = null
    this.toolsToggleBtn = null
    if (this.options.editable) {
      this.ensureToolbarHost()
    }

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
    element.addEventListener('input', this.onElementInput)
    element.addEventListener('change', this.onElementInput)
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
      this.vectorLayer.setStyle(
        this.options.customStyle ?? geometryStyleFunction,
      )
      this.drawBar?.setStyle(this.options.customStyle)
    }

    if (patch.editable !== undefined) {
      this.applyEditable()
    } else if (patch.toolsToggle !== undefined) {
      this.applyToolsChrome()
    } else if (
      this.drawBar &&
      patch.geometryType !== undefined &&
      patch.geometryType !== prev.geometryType
    ) {
      this.drawBar.setGeometryType(
        this.options.geometryType as GeometryTypeOption,
      )
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
    let features = parseRawToFeatures(this.getRawData())
    const primary = primaryGeometryType(
      parseGeometryTypes(this.options.geometryType),
    )
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
    this.drawBar = null
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
    this.element.classList.add(
      'ec-geometry-editor-source--hidden',
      'fr-hidden',
    )
  }

  private showSourceElement(): void {
    this.element.hidden = false
    this.element.removeAttribute('aria-hidden')
    this.element.classList.remove(
      'ec-geometry-editor-source--hidden',
      'fr-hidden',
    )
  }

  private applyView(patch: GeometryEditorOptions): void {
    const view = this.map.getView()
    if (patch.lon !== undefined || patch.lat !== undefined) {
      const next = fromLonLat([this.options.lon, this.options.lat])
      const cur = view.getCenter()
      if (
        !cur ||
        Math.abs(cur[0] - next[0]) > 1e-3 ||
        Math.abs(cur[1] - next[1]) > 1e-3
      ) {
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

  private ensureToolbarHost(): HTMLElement {
    this.applyToolsChrome()
    return this.toolbarHost!
  }

  private setToolsMenuOpen(open: boolean): void {
    this.toolsMenuOpen = open
    if (this.toolsToggleBtn) {
      this.toolsToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
      this.toolsToggleBtn.classList.toggle('is-active', open)
    }
    if (this.toolbarHost && this.options.toolsToggle) {
      this.toolbarHost.hidden = !open
    }
    if (this.toolsRoot) {
      this.toolsRoot.classList.toggle('is-open', open)
    }
  }

  /**
   * Positionne le chrome outils (toujours visibles à gauche, ou bouton + panneau
   * selon `toolsToggle`).
   */
  private applyToolsChrome(): void {
    if (!this.toolsRoot) {
      this.toolsRoot = document.createElement('div')
      this.toolsRoot.className = 'ec-geometry-editor__tools-root'
      this.mapHost.appendChild(this.toolsRoot)
    }
    if (!this.toolbarHost) {
      this.toolbarHost = document.createElement('div')
      this.toolbarHost.className = 'ec-geometry-editor__toolbar'
      this.toolbarHost.setAttribute('role', 'toolbar')
      this.toolbarHost.setAttribute('aria-label', 'Outils de dessin')
    }

    const corner = this.options.toolsToggle as ToolsToggleCorner | null

    if (corner) {
      if (!this.toolsToggleBtn) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className =
          'ec-geometry-editor__tool ec-geometry-editor__tool--tools-toggle fr-icon-tools-fill'
        btn.title = 'Outils de dessin'
        btn.setAttribute('aria-label', 'Outils de dessin')
        btn.setAttribute('aria-expanded', 'false')
        btn.setAttribute('aria-controls', this.toolbarDomId)
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.setToolsMenuOpen(!this.toolsMenuOpen)
        })
        this.toolsToggleBtn = btn
      }
      this.toolbarHost.id = this.toolbarDomId
      this.toolsRoot.replaceChildren(this.toolsToggleBtn, this.toolbarHost)
      this.toolsRoot.dataset.corner = corner
      this.setToolsMenuOpen(this.toolsMenuOpen)
    } else {
      this.toolsMenuOpen = false
      this.toolsToggleBtn = null
      this.toolbarHost.removeAttribute('id')
      this.toolbarHost.hidden = false
      this.toolsRoot.replaceChildren(this.toolbarHost)
      delete this.toolsRoot.dataset.corner
      this.toolsRoot.classList.remove('is-open')
    }

    this.applyHostClass()
  }

  private applyEditable(): void {
    if (this.options.editable) {
      const host = this.ensureToolbarHost()
      if (this.toolsRoot) this.toolsRoot.hidden = false
      host.hidden = Boolean(this.options.toolsToggle) && !this.toolsMenuOpen
      if (!this.drawBar) {
        this.drawBar = new DrawToolsBar({
          map: this.map,
          source: this.source,
          layer: this.vectorLayer,
          geometryType: this.options.geometryType as GeometryTypeOption,
          target: host,
          style: this.options.customStyle,
          onChange: () => this.serializeToElement(),
        })
      } else {
        this.drawBar.setGeometryType(
          this.options.geometryType as GeometryTypeOption,
        )
        this.drawBar.setStyle(this.options.customStyle)
      }
    } else {
      this.drawBar?.destroy()
      this.drawBar = null
      this.setToolsMenuOpen(false)
      if (this.toolsRoot) {
        this.toolsRoot.hidden = true
      }
    }
  }
}
