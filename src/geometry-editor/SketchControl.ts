/**
 * Contrôle OpenLayers de croquis (dessin / édition).
 * Réutilisé par GeometryEditor (formulaire) et la carte principale.
 *
 * GeometryEditor : pas de localStorage, clearAll, Text, Import, Export, mesures,
 * ni enableFeatureStyleEditor (comportement historique inchangé).
 */
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import GeoJSON from 'ol/format/GeoJSON'
import Draw from 'ol/interaction/Draw'
import { DrawToolsBar, type DrawBarExtraTool } from './DrawToolsBar'
import { geometryStyleFunction } from './styles'
import { parseRawToFeatures } from './parseGeometry'
import { serializeFeatures } from './serializeGeometry'
import { restoreCircleFeaturesForKind } from './circleHelpers'
import {
  parseGeometryTypes,
  primaryGeometryType,
} from './geometryTypeUtils'
import type {
  GeometryOutputFormat,
  GeometryTypeOption,
  ToolsToggleCorner,
} from './types'
import { SketchHistory } from './sketch/SketchHistory'
import {
  applySketchTextStyle,
  isSketchTextFeature,
  sketchTextStyle,
} from './sketch/SketchTextPopup'
import { SketchFeatureStylePopup } from './sketch/SketchFeatureStylePopup'
import { SketchMeasureController } from './sketch/SketchMeasureController'
import { SketchExportDialog } from './sketch/SketchExportDialog'
import {
  downloadBlob,
  formatFromFilename,
  hydrateImportedSketchFeatures,
  pickSketchFile,
  readSketchFile,
  writeSketchFile,
} from './sketch/sketchIo'

export type SketchExtraTool =
  | 'Text'
  | 'Import'
  | 'Export'
  | 'MeasureDistance'
  | 'MeasureArea'

export interface SketchControlOptions {
  /** Types d’outils (CSV accepté). Défaut `'Geometry'`. */
  geometryType?: GeometryTypeOption
  /**
   * Coin du bouton menu outils.
   * `null` → barre toujours visible (colonne gauche, comportement GeometryEditor).
   */
  toolsToggle?: ToolsToggleCorner | null
  /**
   * Coin geopf pour placer le contrôle dans `.position-container-*`
   * (carte principale). Ignoré si le conteneur n’existe pas.
   */
  position?: ToolsToggleCorner
  source?: VectorSource
  layer?: VectorLayer
  style?: StyleLike | null
  /** zIndex de la couche croquis si créée ici (défaut 500). */
  zIndex?: number
  onChange?: (features: OlFeature<OlGeometry>[]) => void
  /**
   * Clé localStorage : charge au montage.
   * Enregistrement **manuel** via bouton (pas d’auto-save).
   * `null` / omis → pas de persistance.
   */
  localStorageKey?: string | null
  /** Bouton « tout supprimer » dans la barre. */
  clearAll?: boolean
  /** Boutons Défaire / Refaire. */
  history?: boolean
  /**
   * Outils additionnels (Text, Import, Export, Measure*).
   * GeometryEditor ne les passe pas.
   */
  extraTools?: SketchExtraTool[]
  /**
   * Popup de style à la création (et reclic texte).
   * Défaut `false` — GeometryEditor inchangé.
   */
  enableFeatureStyleEditor?: boolean
}

const GEOJSON = new GeoJSON()

const EXTRA_DEFS: Record<
  SketchExtraTool,
  { id: string; label: string; iconClass: string; mode: 'action' | 'toggle' }
> = {
  Text: {
    id: 'text',
    label: 'Texte',
    iconClass: 'ec-geometry-editor__tool--text',
    mode: 'toggle',
  },
  Import: {
    id: 'import',
    label: 'Importer',
    iconClass: 'ec-geometry-editor__tool--import',
    mode: 'action',
  },
  Export: {
    id: 'export',
    label: 'Exporter',
    iconClass: 'ec-geometry-editor__tool--export',
    mode: 'action',
  },
  MeasureDistance: {
    id: 'measure-distance',
    label: 'Mesurer une distance',
    iconClass: 'ec-geometry-editor__tool--measure-distance',
    mode: 'toggle',
  },
  MeasureArea: {
    id: 'measure-area',
    label: 'Mesurer une surface',
    iconClass: 'ec-geometry-editor__tool--measure-area',
    mode: 'toggle',
  },
}

export class SketchControl extends Control {
  private geometryType: GeometryTypeOption
  private toolsToggle: ToolsToggleCorner | null
  private readonly position: ToolsToggleCorner | null
  private style: StyleLike | null | undefined
  private readonly zIndex: number
  private readonly onChangeCb: SketchControlOptions['onChange']
  private readonly localStorageKey: string | null
  private readonly clearAll: boolean
  private readonly historyEnabled: boolean
  private readonly extraTools: SketchExtraTool[]
  private readonly enableFeatureStyleEditor: boolean

  private source: VectorSource
  private layer: VectorLayer | null
  private ownsLayer: boolean

  private toolsRoot: HTMLElement
  private toolbarHost: HTMLElement
  private toolsToggleBtn: HTMLButtonElement | null = null
  private toolsMenuOpen = false
  private readonly toolbarDomId = `ec-sketch-toolbar-${Math.random().toString(36).slice(2, 9)}`

  private drawBar: DrawToolsBar | null = null
  private history: SketchHistory | null = null
  private stylePopup: SketchFeatureStylePopup | null = null
  private textDraw: Draw | null = null
  private textPointerOnMap = true
  private textMapHoverBound = false
  private exportDialog: SketchExportDialog | null = null
  private measure: SketchMeasureController | null = null
  /** Snapshot GeoJSON du dernier enregistrement local (null = jamais enregistré). */
  private savedSnapshot: string | null = null

  private readonly onTextMapPointerEnter = (): void => {
    this.textPointerOnMap = true
    this.getMap()?.render()
  }

  private readonly onTextMapPointerLeave = (): void => {
    this.textPointerOnMap = false
    this.getMap()?.render()
  }

  private readonly onTextSelectClick = (evt: MapBrowserEvent): void => {
    if (evt.dragging || !this.enableFeatureStyleEditor) return
    const map = this.getMap()
    if (!map || !this.layer) return
    const hits = map.getFeaturesAtPixel(evt.pixel, {
      layerFilter: (l) => l === this.layer,
      hitTolerance: 14,
    }) as OlFeature[]
    const feature = hits.find((f) => isSketchTextFeature(f))
    if (feature && this.stylePopup) {
      this.stylePopup.open(feature, () => this.notifyChange())
    }
  }

  constructor(options: SketchControlOptions = {}) {
    const toolsRoot = document.createElement('div')
    toolsRoot.className = 'ec-sketch-control ec-geometry-editor__tools-root'
    toolsRoot.setAttribute('aria-label', 'Croquis')
    toolsRoot.id = `GPsketch-${Date.now()}`

    super({ element: toolsRoot })

    this.geometryType = options.geometryType ?? 'Geometry'
    this.toolsToggle = options.toolsToggle ?? null
    this.position = options.position ?? null
    this.style = options.style
    this.zIndex = options.zIndex ?? 500
    this.onChangeCb = options.onChange
    this.localStorageKey = options.localStorageKey ?? null
    this.clearAll = Boolean(options.clearAll)
    this.historyEnabled = Boolean(options.history)
    this.extraTools = options.extraTools ?? []
    this.enableFeatureStyleEditor = Boolean(options.enableFeatureStyleEditor)

    this.source = options.source ?? new VectorSource({ wrapX: false })
    this.layer = options.layer ?? null
    this.ownsLayer = !options.layer

    this.toolsRoot = toolsRoot
    this.toolbarHost = document.createElement('div')
    this.toolbarHost.className = 'ec-geometry-editor__toolbar'
    this.toolbarHost.setAttribute('role', 'toolbar')
    this.toolbarHost.setAttribute('aria-label', 'Outils de dessin')

    this.applyToolsChrome()
  }

  override setMap(map: Map | null): void {
    const prev = this.getMap()
    if (prev) {
      this.teardownExtras(prev)
      if (this.drawBar) this.teardownDrawBar()
      if (this.ownsLayer && this.layer) prev.removeLayer(this.layer)
    }

    super.setMap(map)

    if (!map) {
      this.layer = this.ownsLayer ? null : this.layer
      return
    }

    this.ensureLayer(map)
    this.mountDrawBar(map)
    this.placeInGeopfContainer(map)
    this.restoreFromLocalStorage()
    this.history?.resetFromSource()
    if (this.localStorageKey && this.source.getFeatures().length) {
      this.savedSnapshot = this.sketchSnapshot()
    }
    this.syncHistoryButtons()
    this.syncSaveButtonState()
  }

  getSource(): VectorSource {
    return this.source
  }

  getElement(): HTMLElement {
    return this.toolsRoot
  }

  getLayer(): VectorLayer | null {
    return this.layer
  }

  getDrawBar(): DrawToolsBar | null {
    return this.drawBar
  }

  getFeatures(): OlFeature<OlGeometry>[] {
    return this.source.getFeatures() as OlFeature<OlGeometry>[]
  }

  setFeatures(features: OlFeature<OlGeometry>[]): void {
    this.source.clear(true)
    if (features.length) this.source.addFeatures(features)
    this.history?.push()
    this.notifyChange()
  }

  clearFeatures(): void {
    this.source.clear(true)
    this.measure?.clear()
    this.history?.push()
    this.notifyChange()
  }

  /** Enregistrement manuel localStorage. */
  saveLocal(): void {
    this.saveToLocalStorage()
  }

  load(raw: string): void {
    let features = parseRawToFeatures(raw)
    const primary = primaryGeometryType(parseGeometryTypes(this.geometryType))
    if (primary === 'Circle' || primary === 'MultiCircle') {
      features = restoreCircleFeaturesForKind(features, 'circle')
    } else if (primary === 'Disc' || primary === 'MultiDisc') {
      features = restoreCircleFeaturesForKind(features, 'disc')
    }
    this.source.clear(true)
    if (features.length) this.source.addFeatures(features)
    this.history?.push()
    this.notifyChange()
  }

  serialize(opts?: {
    geometryType?: GeometryTypeOption
    outputFormat?: GeometryOutputFormat
    precision?: number
  }): string {
    return serializeFeatures(this.getFeatures(), {
      geometryType: opts?.geometryType ?? this.geometryType,
      outputFormat: opts?.outputFormat ?? 'geojson',
      precision: opts?.precision ?? 7,
    })
  }

  setGeometryType(geometryType: GeometryTypeOption): void {
    this.geometryType = geometryType
    this.drawBar?.setGeometryType(geometryType)
  }

  setStyle(style: StyleLike | null | undefined): void {
    this.style = style
    this.layer?.setStyle(style ?? geometryStyleFunction)
    this.drawBar?.setStyle(style)
  }

  setToolsToggle(corner: ToolsToggleCorner | null): void {
    this.toolsToggle = corner
    this.applyToolsChrome()
    const map = this.getMap()
    if (map && this.drawBar) {
      this.toolbarHost.hidden =
        Boolean(this.toolsToggle) && !this.toolsMenuOpen
    }
  }

  private buildExtraTools(): DrawBarExtraTool[] {
    const list: DrawBarExtraTool[] = []
    if (this.historyEnabled) {
      list.push(
        {
          id: 'undo',
          label: 'Annuler',
          iconClass: 'ec-geometry-editor__tool--undo',
          mode: 'action',
        },
        {
          id: 'redo',
          label: 'Rétablir',
          iconClass: 'ec-geometry-editor__tool--redo',
          mode: 'action',
        },
      )
    }
    if (this.localStorageKey) {
      list.push({
        id: 'save',
        label: 'Enregistrer localement',
        iconClass: 'ec-geometry-editor__tool--save',
        mode: 'action',
      })
    }
    for (const key of this.extraTools) {
      const def = EXTRA_DEFS[key]
      if (def) list.push({ ...def })
    }
    return list
  }

  private ensureLayer(map: Map): void {
    if (this.layer) {
      if (this.style !== undefined) {
        this.layer.setStyle(this.style ?? geometryStyleFunction)
      }
      if (!map.getLayers().getArray().includes(this.layer)) {
        map.addLayer(this.layer)
      }
      return
    }
    this.layer = new VectorLayer({
      source: this.source,
      style: this.style ?? geometryStyleFunction,
      zIndex: this.zIndex,
      className: 'ec-sketch-control__layer',
      properties: {
        'ec-sketch': true,
        'ec-geometry-tools': true,
      },
    })
    this.ownsLayer = true
    map.addLayer(this.layer)
  }

  private mountDrawBar(map: Map): void {
    if (!this.layer) return
    this.drawBar?.destroy()
    this.history = this.historyEnabled
      ? new SketchHistory(this.source, () => map.getView().getProjection())
      : null
    this.stylePopup?.destroy()
    this.stylePopup = null
    if (this.enableFeatureStyleEditor) {
      this.stylePopup = new SketchFeatureStylePopup(map)
    }
    this.exportDialog?.destroy()
    this.exportDialog = null
    if (this.extraTools.includes('Export')) {
      const mapEl = map.getTargetElement()
      if (mapEl) this.exportDialog = new SketchExportDialog(mapEl)
    }
    this.measure?.destroy()
    this.measure = null
    if (
      this.extraTools.includes('MeasureDistance') ||
      this.extraTools.includes('MeasureArea')
    ) {
      this.measure = new SketchMeasureController(map, this.zIndex + 10)
    }

    this.drawBar = new DrawToolsBar({
      map,
      source: this.source,
      layer: this.layer,
      geometryType: this.geometryType,
      target: this.toolbarHost,
      style: this.style,
      clearAll: this.clearAll,
      extraTools: this.buildExtraTools(),
      onChange: () => {
        this.history?.push()
        this.notifyChange()
      },
      onClearAll: () => this.clearFeatures(),
      onExtraTool: (id, active) => this.handleExtraTool(id, active),
      onFeatureCreated: (feature) => this.openStylePopup(feature),
      onStyleEdit: this.enableFeatureStyleEditor
        ? (feature) => this.openStylePopup(feature)
        : undefined,
    })
    this.toolbarHost.hidden =
      Boolean(this.toolsToggle) && !this.toolsMenuOpen
    this.syncHistoryButtons()
  }

  private openStylePopup(feature: OlFeature<OlGeometry>): void {
    if (!this.enableFeatureStyleEditor || !this.stylePopup) return
    this.stylePopup.open(feature, () => this.notifyChange())
  }

  private handleExtraTool(id: string, active: boolean): void {
    const map = this.getMap()
    if (!map) return

    if (id === 'undo') {
      if (this.history?.undo()) this.notifyChange()
      this.syncHistoryButtons()
      return
    }
    if (id === 'redo') {
      if (this.history?.redo()) this.notifyChange()
      this.syncHistoryButtons()
      return
    }
    if (id === 'save') {
      this.saveToLocalStorage()
      return
    }
    if (id === 'import') {
      this.runImport()
      return
    }
    if (id === 'export') {
      this.runExport()
      return
    }

    if (!active) {
      this.stopTextDraw()
      this.measure?.deactivateDraw()
      return
    }

    this.stopTextDraw()
    this.measure?.deactivateDraw()

    if (id === 'text') {
      this.startTextDraw()
      return
    }
    if (id === 'measure-distance') {
      this.measure?.activate('distance')
      return
    }
    if (id === 'measure-area') {
      this.measure?.activate('area')
    }
  }

  private startTextDraw(): void {
    const map = this.getMap()
    if (!map) return
    this.stopTextDraw()
    const textDefaults = {
      text: 'Texte',
      fontSize: 14,
      fontColor: '#000091',
      strokeColor: '#ffffff',
      rotation: 0,
    }
    const baseStyle = sketchTextStyle(textDefaults)
    this.textPointerOnMap = true
    this.textDraw = new Draw({
      source: this.source,
      type: 'Point',
      style: () => (this.textPointerOnMap ? baseStyle : []),
    })
    this.textDraw.on('drawend', (evt) => {
      applySketchTextStyle(evt.feature, textDefaults)
      queueMicrotask(() => {
        this.openStylePopup(evt.feature)
        this.history?.push()
        this.notifyChange()
      })
    })
    map.addInteraction(this.textDraw)
    const el = map.getTargetElement()
    if (el && !this.textMapHoverBound) {
      el.addEventListener('pointerenter', this.onTextMapPointerEnter)
      el.addEventListener('pointerleave', this.onTextMapPointerLeave)
      this.textMapHoverBound = true
    }
    if (this.enableFeatureStyleEditor) {
      map.on('singleclick', this.onTextSelectClick)
    }
  }

  private stopTextDraw(): void {
    const map = this.getMap()
    if (this.textMapHoverBound) {
      const el = map?.getTargetElement()
      el?.removeEventListener('pointerenter', this.onTextMapPointerEnter)
      el?.removeEventListener('pointerleave', this.onTextMapPointerLeave)
      this.textMapHoverBound = false
      this.textPointerOnMap = true
    }
    if (this.textDraw && map) {
      map.removeInteraction(this.textDraw)
      this.textDraw = null
    }
    map?.un('singleclick', this.onTextSelectClick)
    this.stylePopup?.hide()
  }

  private runImport(): void {
    const map = this.getMap()
    if (!map) return
    pickSketchFile('.geojson,.json,.kml,application/geo+json,application/vnd.google-earth.kml+xml', (text, name) => {
      try {
        const format = formatFromFilename(name)
        const features = readSketchFile(map, text, format)
        this.source.addFeatures(features)
        this.history?.push()
        this.notifyChange()
      } catch (err) {
        console.warn('[SketchControl] import failed', err)
      }
    })
  }

  private async runExport(): Promise<void> {
    const map = this.getMap()
    if (!map) return
    const dialog = this.exportDialog
    if (!dialog) return
    const format = await dialog.open('geojson')
    if (!format) return
    try {
      const content = writeSketchFile(map, this.source, format)
      downloadBlob(
        format === 'kml' ? 'croquis.kml' : 'croquis.geojson',
        content,
        format === 'kml'
          ? 'application/vnd.google-earth.kml+xml'
          : 'application/geo+json',
      )
    } catch (err) {
      console.warn('[SketchControl] export failed', err)
    }
  }

  private syncHistoryButtons(): void {
    if (!this.drawBar || !this.history) return
    this.drawBar.setExtraEnabled('undo', this.history.canUndo())
    this.drawBar.setExtraEnabled('redo', this.history.canRedo())
  }

  private teardownDrawBar(): void {
    this.drawBar?.destroy()
    this.drawBar = null
    this.toolbarHost.replaceChildren()
  }

  private teardownExtras(map: Map): void {
    this.stopTextDraw()
    this.stylePopup?.destroy()
    this.stylePopup = null
    this.exportDialog?.destroy()
    this.exportDialog = null
    this.measure?.destroy()
    this.measure = null
    this.history = null
    void map
  }

  private notifyChange(): void {
    this.onChangeCb?.(this.getFeatures())
    this.syncHistoryButtons()
    this.syncSaveButtonState()
  }

  private sketchSnapshot(): string {
    const features = this.getFeatures()
    return JSON.stringify(
      GEOJSON.writeFeaturesObject(features, {
        featureProjection: this.getMap()?.getView().getProjection(),
        dataProjection: 'EPSG:4326',
      }),
    )
  }

  private syncSaveButtonState(): void {
    if (!this.localStorageKey || !this.drawBar) return
    if (this.savedSnapshot === null) {
      this.drawBar.setSaveState('idle')
      return
    }
    const dirty = this.sketchSnapshot() !== this.savedSnapshot
    this.drawBar.setSaveState(dirty ? 'dirty' : 'saved')
  }

  private saveToLocalStorage(): void {
    if (!this.localStorageKey || typeof localStorage === 'undefined') return
    try {
      const features = this.getFeatures()
      if (!features.length) {
        localStorage.removeItem(this.localStorageKey)
        this.savedSnapshot = this.sketchSnapshot()
        this.syncSaveButtonState()
        return
      }
      const json = GEOJSON.writeFeaturesObject(features, {
        featureProjection: this.getMap()?.getView().getProjection(),
        dataProjection: 'EPSG:4326',
      })
      localStorage.setItem(this.localStorageKey, JSON.stringify(json))
      this.savedSnapshot = JSON.stringify(json)
      this.syncSaveButtonState()
    } catch (err) {
      console.warn('[SketchControl] localStorage save failed', err)
    }
  }

  private restoreFromLocalStorage(): void {
    if (!this.localStorageKey || typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(this.localStorageKey)
      if (!raw) return
      const features = GEOJSON.readFeatures(JSON.parse(raw), {
        featureProjection: this.getMap()?.getView().getProjection(),
        dataProjection: 'EPSG:4326',
      }) as OlFeature<OlGeometry>[]
      hydrateImportedSketchFeatures(features)
      this.source.clear(true)
      if (features.length) this.source.addFeatures(features)
    } catch (err) {
      console.warn('[SketchControl] localStorage restore failed', err)
    }
  }

  private setToolsMenuOpen(open: boolean): void {
    this.toolsMenuOpen = open
    if (this.toolsToggleBtn) {
      this.toolsToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
      this.toolsToggleBtn.setAttribute('aria-pressed', open ? 'true' : 'false')
      this.toolsToggleBtn.classList.toggle('is-active', open)
    }
    if (this.toolsToggle) {
      this.toolbarHost.hidden = !open
    }
    this.toolsRoot.classList.toggle('is-open', open)
  }

  private applyToolsChrome(): void {
    const corner = this.toolsToggle

    if (corner) {
      if (!this.toolsToggleBtn) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className =
          'ec-geometry-editor__tool ec-geometry-editor__tool--tools-toggle'
        btn.setAttribute('aria-label', 'Outils de dessin')
        btn.setAttribute('aria-expanded', 'false')
        btn.setAttribute('aria-pressed', 'false')
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
  }

  private placeInGeopfContainer(map: Map, attempt = 0): void {
    const corner = this.position ?? this.toolsToggle
    if (!corner) return
    const target = map.getTargetElement()
    if (!(target instanceof HTMLElement)) return
    const container = target.querySelector(`.position-container-${corner}`)
    if (!(container instanceof HTMLElement)) {
      if (attempt < 20) {
        requestAnimationFrame(() => this.placeInGeopfContainer(map, attempt + 1))
      }
      return
    }
    this.toolsRoot.classList.add('ec-sketch-control--geopf-slot')
    if (this.toolsRoot.parentElement !== container) {
      container.appendChild(this.toolsRoot)
    }
  }
}
