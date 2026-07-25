/**
 * Contrôle OpenLayers de croquis (dessin / édition).
 * Réutilisé par GeometryEditor (formulaire) et la carte principale.
 *
 * GeometryEditor : pas de localStorage, clearAll, Text, Import, Export, mesures
 * (comportement historique inchangé).
 */
import Control from 'ol/control/Control'
import type Map from 'ol/Map'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import GeoJSON from 'ol/format/GeoJSON'
import { DrawToolsBar } from './DrawToolsBar'
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
   * Clé localStorage : charge au montage, enregistre après chaque changement.
   * `null` / omis → pas de persistance.
   */
  localStorageKey?: string | null
  /** Bouton « tout supprimer » dans la barre. */
  clearAll?: boolean
  /**
   * Outils roadmap (Text, Import, Export, Measure*).
   * Non branchés pour l’instant — réservés ; GeometryEditor ne les passe pas.
   */
  extraTools?: SketchExtraTool[]
}

const GEOJSON = new GeoJSON()

export class SketchControl extends Control {
  private geometryType: GeometryTypeOption
  private toolsToggle: ToolsToggleCorner | null
  private readonly position: ToolsToggleCorner | null
  private style: StyleLike | null | undefined
  private readonly zIndex: number
  private readonly onChangeCb: SketchControlOptions['onChange']
  private readonly localStorageKey: string | null
  private readonly clearAll: boolean
  private readonly extraTools: SketchExtraTool[]

  private source: VectorSource
  private layer: VectorLayer | null
  private ownsLayer: boolean

  private toolsRoot: HTMLElement
  private toolbarHost: HTMLElement
  private toolsToggleBtn: HTMLButtonElement | null = null
  private toolsMenuOpen = false
  private readonly toolbarDomId = `ec-sketch-toolbar-${Math.random().toString(36).slice(2, 9)}`

  private drawBar: DrawToolsBar | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: SketchControlOptions = {}) {
    const toolsRoot = document.createElement('div')
    // Mêmes classes que GeometryEditor.applyToolsChrome (pas de ol-control :
    // les styles OL cassent les boutons 48×48).
    toolsRoot.className = 'ec-sketch-control ec-geometry-editor__tools-root'
    toolsRoot.setAttribute('aria-label', 'Croquis')
    /*
     * Id format geopf (`Nom-123…`) obligatoire si le contrôle est dans
     * `.position-container-*` : PanelManager (Territories, etc.) fait
     * `p.id.match(/(\w+)-[0-9]+/)[1]` sur chaque enfant.
     */
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
    this.extraTools = options.extraTools ?? []

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
    if (prev && this.drawBar) {
      this.teardownDrawBar()
    }
    if (prev && this.ownsLayer && this.layer) {
      prev.removeLayer(this.layer)
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
  }

  getSource(): VectorSource {
    return this.source
  }

  /** Élément DOM du contrôle (chrome outils). */
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
    this.notifyChange()
  }

  clearFeatures(): void {
    this.source.clear(true)
    this.notifyChange()
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
    this.drawBar = new DrawToolsBar({
      map,
      source: this.source,
      layer: this.layer,
      geometryType: this.geometryType,
      target: this.toolbarHost,
      style: this.style,
      clearAll: this.clearAll,
      onChange: () => this.notifyChange(),
      onClearAll: () => this.clearFeatures(),
    })
    // extraTools réservés (Text / Import / Export / Measure*) — pas encore branchés
    void this.extraTools
    this.toolbarHost.hidden =
      Boolean(this.toolsToggle) && !this.toolsMenuOpen
  }

  private teardownDrawBar(): void {
    this.drawBar?.destroy()
    this.drawBar = null
    this.toolbarHost.replaceChildren()
  }

  private notifyChange(): void {
    this.onChangeCb?.(this.getFeatures())
    this.scheduleSave()
  }

  private scheduleSave(): void {
    if (!this.localStorageKey) return
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.saveToLocalStorage()
    }, 200)
  }

  private saveToLocalStorage(): void {
    if (!this.localStorageKey || typeof localStorage === 'undefined') return
    try {
      const features = this.getFeatures()
      if (!features.length) {
        localStorage.removeItem(this.localStorageKey)
        return
      }
      const json = GEOJSON.writeFeaturesObject(features, {
        featureProjection: this.getMap()?.getView().getProjection(),
        dataProjection: 'EPSG:4326',
      })
      localStorage.setItem(this.localStorageKey, JSON.stringify(json))
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
      })
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

  /**
   * Place le contrôle dans le conteneur geopf du coin demandé (carte principale),
   * au-dessus de la minimap via `order: -2`.
   * Retente si le conteneur n’existe pas encore (ordre d’ajout des contrôles).
   */
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
