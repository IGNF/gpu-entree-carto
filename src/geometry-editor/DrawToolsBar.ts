import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type VectorLayer from 'ol/layer/Vector'
import type VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import Circle from 'ol/geom/Circle'
import Draw, { createBox } from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Snap from 'ol/interaction/Snap'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import type { GeometryTypeOption } from './types'
import { discDrawStyle, geometryDrawStyle } from './styles'
import { getCircleKind, isNearCircleEdge, setCircleKind, type CircleKind } from './circleHelpers'
import {
  drawToolKeys,
  parseGeometryTypes,
  shouldReplaceOnDraw,
  type GeometryTypeName,
} from './geometryTypeUtils'
import { ModifyTransformController, transformModeFor } from './ModifyTransformController'
import { isSketchTextFeature } from './sketch/SketchTextPopup'

type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Circle'

interface ToolDef {
  id: string
  label: string
  /** Classe BEM pour le masque SVG (icônes geopf Drawing) */
  iconClass: string
  drawType?: DrawType
  box?: boolean
  /** Marque Circle vs Disc après drawend */
  circleKind?: CircleKind
  modify?: boolean
  remove?: boolean
  clearAll?: boolean
  /** Outil action (save / undo / …) — pas de mode sticky */
  action?: boolean
  /** Outil toggle géré hors DrawToolsBar (text / measure / …) */
  extraToggle?: boolean
  /** Séparateur visuel (pas un bouton) */
  separator?: boolean
}

export interface DrawBarExtraTool {
  id: string
  label: string
  iconClass: string
  /** `action` = clic unique ; `toggle` = outil activable (dessin / mesure) */
  mode: 'action' | 'toggle'
}

const modifyTool: ToolDef = {
  id: 'modify',
  label: 'Modifier',
  iconClass: 'ec-geometry-editor__tool--modify',
  modify: true,
}

const removeTool: ToolDef = {
  id: 'remove',
  label: 'Supprimer',
  iconClass: 'ec-geometry-editor__tool--remove',
  remove: true,
}

const clearAllTool: ToolDef = {
  id: 'clear-all',
  label: 'Tout supprimer',
  iconClass: 'ec-geometry-editor__tool--clear-all',
  clearAll: true,
}

const DRAW_TOOL_DEFS: Record<ReturnType<typeof drawToolKeys>[number], ToolDef> = {
  Point: {
    id: 'point',
    label: 'Point',
    iconClass: 'ec-geometry-editor__tool--point',
    drawType: 'Point',
  },
  LineString: {
    id: 'line',
    label: 'Ligne',
    iconClass: 'ec-geometry-editor__tool--line',
    drawType: 'LineString',
  },
  Polygon: {
    id: 'polygon',
    label: 'Polygone',
    iconClass: 'ec-geometry-editor__tool--polygon',
    drawType: 'Polygon',
  },
  Rectangle: {
    id: 'rect',
    label: 'Rectangle',
    iconClass: 'ec-geometry-editor__tool--rectangle',
    drawType: 'Circle',
    box: true,
  },
  Disc: {
    id: 'disc',
    label: 'Disque',
    // Picto contour (ex-Circle) — un seul outil cercle/disque
    iconClass: 'ec-geometry-editor__tool--circle',
    drawType: 'Circle',
    circleKind: 'disc',
  },
}

function drawStyleFor(types: GeometryTypeName[]): StyleLike {
  if (types.length === 1 && (types[0] === 'Disc' || types[0] === 'MultiDisc')) {
    return discDrawStyle
  }
  if (types.length === 1 && (types[0] === 'Circle' || types[0] === 'MultiCircle')) {
    return discDrawStyle
  }
  return geometryDrawStyle
}

function toolsFor(geometryType: GeometryTypeOption): ToolDef[] {
  const types = parseGeometryTypes(geometryType)
  const keys = drawToolKeys(types)
  const drawTools = keys.map((k) => DRAW_TOOL_DEFS[k])
  // Un seul outil de dessin : id `draw` pour compat aria / activation
  if (drawTools.length === 1) {
    return [{ ...drawTools[0], id: 'draw' }, modifyTool, removeTool]
  }
  return [...drawTools, modifyTool, removeTool]
}

export class DrawToolsBar {
  private readonly map: Map
  private readonly source: VectorSource
  private readonly layer: VectorLayer
  private readonly target: HTMLElement
  private readonly onChange: () => void
  private readonly onClearAll: (() => void) | null
  private readonly showClearAll: boolean
  private readonly extraTools: DrawBarExtraTool[]
  private readonly onExtraTool: ((id: string, active: boolean) => void) | null
  private readonly onFeatureCreated: ((feature: OlFeature<OlGeometry>) => void) | null
  private geometryType: GeometryTypeOption
  private drawStyle: StyleLike
  private customStyle: StyleLike | null | undefined
  private activeId: string | null = null
  private draw: Draw | null = null
  private modify: Modify | null = null
  private snap: Snap | null = null
  private readonly transform: ModifyTransformController
  private readonly removeEdgeTolPx = 12
  /** Masque le croquis Draw tant que le pointeur est hors de la carte. */
  private pointerOnMap = true
  private mapHoverBound = false

  private readonly onMapPointerEnter = (): void => {
    this.pointerOnMap = true
    this.map.render()
  }

  private readonly onMapPointerLeave = (): void => {
    this.pointerOnMap = false
    this.map.render()
  }

  private bindMapHover(): void {
    if (this.mapHoverBound) return
    const el = this.map.getTargetElement()
    if (!el) return
    el.addEventListener('pointerenter', this.onMapPointerEnter)
    el.addEventListener('pointerleave', this.onMapPointerLeave)
    this.mapHoverBound = true
  }

  private unbindMapHover(): void {
    if (!this.mapHoverBound) return
    const el = this.map.getTargetElement()
    el?.removeEventListener('pointerenter', this.onMapPointerEnter)
    el?.removeEventListener('pointerleave', this.onMapPointerLeave)
    this.mapHoverBound = false
    this.pointerOnMap = true
  }

  private wrapDrawStyle(base: StyleLike): StyleLike {
    return (feature, resolution) => {
      if (!this.pointerOnMap) return []
      if (typeof base === 'function') {
        return base(feature, resolution)
      }
      return base
    }
  }
  private readonly onRemoveClick = (evt: MapBrowserEvent): void => {
    if (evt.dragging) return
    const res = this.map.getView().getResolution() ?? 1
    const edgeTol = this.removeEdgeTolPx * res
    const hits = this.map.getFeaturesAtPixel(evt.pixel, {
      layerFilter: (layer) => layer === this.layer,
      hitTolerance: this.removeEdgeTolPx,
    }) as OlFeature[]
    for (const feature of hits) {
      if (!this.source.hasFeature(feature)) continue
      const geom = feature.getGeometry()
      // Circle (contour) : suppression uniquement sur l’arête (pas l’intérieur)
      if (geom instanceof Circle && getCircleKind(feature) === 'circle') {
        if (!isNearCircleEdge(geom, evt.coordinate, edgeTol)) continue
      }
      this.source.removeFeature(feature)
      this.onChange()
      return
    }
  }
  private readonly onFeaturePointerMove = (evt: MapBrowserEvent): void => {
    if (evt.dragging) return
    // En mode modify, le curseur est géré par ModifyTransformController
    if (this.activeId === 'modify') return
    const target = this.map.getTargetElement()
    if (!target) return

    if (this.activeId === 'remove') {
      const res = this.map.getView().getResolution() ?? 1
      const edgeTol = this.removeEdgeTolPx * res
      const hits = this.map.getFeaturesAtPixel(evt.pixel, {
        layerFilter: (layer) => layer === this.layer,
        hitTolerance: this.removeEdgeTolPx,
      }) as OlFeature[]
      const canRemove = hits.some((feature) => {
        if (!this.source.hasFeature(feature)) return false
        const geom = feature.getGeometry()
        if (geom instanceof Circle && getCircleKind(feature) === 'circle') {
          return isNearCircleEdge(geom, evt.coordinate, edgeTol)
        }
        return true
      })
      target.style.cursor = canRemove ? 'pointer' : ''
      return
    }

    const hit = this.map.hasFeatureAtPixel(evt.pixel, {
      layerFilter: (layer) => layer === this.layer,
      hitTolerance: 12,
    })
    target.style.cursor = hit ? 'pointer' : ''
  }

  constructor(opts: {
    map: Map
    source: VectorSource
    layer: VectorLayer
    geometryType: GeometryTypeOption
    target: HTMLElement
    onChange: () => void
    /** Style du croquis ; défaut bleu France. */
    style?: StyleLike | null
    /** Affiche le bouton « tout supprimer ». */
    clearAll?: boolean
    /** Appelé au clic « tout supprimer » (sinon clear source + onChange). */
    onClearAll?: () => void
    /** Boutons additionnels (save, undo, text, measures…). */
    extraTools?: DrawBarExtraTool[]
    /** Callback extras : `active` true à l’activation toggle, false à la désactivation. */
    onExtraTool?: (id: string, active: boolean) => void
    /** Après drawend d’un outil de dessin classique. */
    onFeatureCreated?: (feature: OlFeature<OlGeometry>) => void
    /** Clic icône palette en mode modification. */
    onStyleEdit?: (feature: OlFeature<OlGeometry>) => void
  }) {
    this.map = opts.map
    this.source = opts.source
    this.layer = opts.layer
    this.geometryType = opts.geometryType
    this.target = opts.target
    this.onChange = opts.onChange
    this.showClearAll = Boolean(opts.clearAll)
    this.onClearAll = opts.onClearAll ?? null
    this.extraTools = opts.extraTools ?? []
    this.onExtraTool = opts.onExtraTool ?? null
    this.onFeatureCreated = opts.onFeatureCreated ?? null
    this.customStyle = opts.style
    this.drawStyle = opts.style ?? drawStyleFor(parseGeometryTypes(opts.geometryType))

    this.modify = new Modify({
      source: this.source,
      // Cercle / disque / texte : gérés par ModifyTransformController
      filter: (feature) =>
        !(feature.getGeometry() instanceof Circle) && !isSketchTextFeature(feature),
    })
    this.modify.setActive(false)
    this.snap = new Snap({ source: this.source })
    this.map.addInteraction(this.modify)
    this.map.addInteraction(this.snap)
    this.modify.on('modifyend', () => this.onChange())

    this.transform = new ModifyTransformController({
      map: this.map,
      source: this.source,
      layer: this.layer,
      mode: transformModeFor(this.geometryType),
      onChange: () => this.onChange(),
      onStyleEdit: opts.onStyleEdit,
    })

    this.render()
  }

  /** Met à jour le type de géométrie (recrée les boutons). */
  setGeometryType(geometryType: GeometryTypeOption): void {
    if (this.geometryType === geometryType) return
    this.clearTransient()
    this.geometryType = geometryType
    this.transform.setMode(transformModeFor(geometryType))
    if (!this.customStyle) {
      this.drawStyle = drawStyleFor(parseGeometryTypes(geometryType))
    }
    this.render()
  }

  /** Met à jour le style du croquis en cours. */
  setStyle(style: StyleLike | null | undefined): void {
    this.clearTransient()
    this.customStyle = style
    this.drawStyle = style ?? drawStyleFor(parseGeometryTypes(this.geometryType))
  }

  private toolsList(): ToolDef[] {
    const toDef = (t: DrawBarExtraTool): ToolDef => ({
      id: t.id,
      label: t.label,
      iconClass: t.iconClass,
      action: t.mode === 'action',
      extraToggle: t.mode === 'toggle',
    })
    const extrasById = new globalThis.Map(this.extraTools.map((t) => [t.id, toDef(t)] as const))
    const pickExtras = (...ids: string[]): ToolDef[] =>
      ids.flatMap((id) => {
        const t = extrasById.get(id)
        return t ? [t] : []
      })

    const core = toolsFor(this.geometryType)
    const drawTools = core.filter((t) => !t.modify && !t.remove)
    const modify = core.find((t) => t.modify)
    const remove = core.find((t) => t.remove)

    // Ordre SketchControl :
    // distance · aire | enregistrer · undo · redo | point… · texte | modifier… | export · import
    const groups: ToolDef[][] = []

    const measures = pickExtras('measure-distance', 'measure-area')
    if (measures.length) groups.push(measures)

    const session = pickExtras('save', 'undo', 'redo')
    if (session.length) groups.push(session)

    const drawGroup = [...drawTools, ...pickExtras('text')]
    if (drawGroup.length) groups.push(drawGroup)

    const editGroup: ToolDef[] = []
    if (modify) editGroup.push(modify)
    if (remove) editGroup.push(remove)
    if (this.showClearAll) editGroup.push(clearAllTool)
    if (editGroup.length) groups.push(editGroup)

    const io = pickExtras('export', 'import')
    if (io.length) groups.push(io)

    const placed = new Set(groups.flat().map((t) => t.id))
    const leftovers = this.extraTools.filter((t) => !placed.has(t.id)).map(toDef)
    if (leftovers.length) groups.push(leftovers)

    const sep = (): ToolDef => ({
      id: 'separator',
      label: '',
      iconClass: 'ec-geometry-editor__toolbar-sep',
      separator: true,
    })

    const out: ToolDef[] = []
    for (let i = 0; i < groups.length; i++) {
      if (i > 0) out.push(sep())
      out.push(...groups[i])
    }
    return out
  }

  /** Active / désactive visuellement un bouton extra (enabled). */
  setExtraEnabled(id: string, enabled: boolean): void {
    const btn = this.target.querySelector<HTMLButtonElement>(`button[data-tool-id="${id}"]`)
    if (!btn) return
    btn.disabled = !enabled
    btn.setAttribute('aria-disabled', enabled ? 'false' : 'true')
  }

  /** État visuel du bouton Enregistrer (badge sauvegardé / modifié). */
  setSaveState(state: 'idle' | 'saved' | 'dirty'): void {
    const btn = this.target.querySelector<HTMLButtonElement>('button[data-tool-id="save"]')
    if (!btn) return
    btn.classList.toggle('ec-geometry-editor__tool--save-saved', state === 'saved')
    btn.classList.toggle('ec-geometry-editor__tool--save-dirty', state === 'dirty')
    const badge = btn.querySelector('.ec-geometry-editor__tool-badge')
    if (badge instanceof HTMLElement) {
      badge.hidden = state === 'idle'
      badge.dataset.state = state
    }
  }

  /** Désactive tout outil transient (dessin, measure externe, etc.). */
  clearActiveTool(): void {
    this.clearTransient()
  }

  getActiveId(): string | null {
    return this.activeId
  }

  private render(): void {
    this.target.replaceChildren()
    let sepIndex = 0
    for (const tool of this.toolsList()) {
      if (tool.separator) {
        const sep = document.createElement('div')
        sep.className = 'ec-geometry-editor__toolbar-sep'
        sep.setAttribute('role', 'separator')
        sep.setAttribute('aria-hidden', 'true')
        sep.dataset.sepIndex = String(sepIndex++)
        this.target.appendChild(sep)
        continue
      }
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ec-geometry-editor__tool ${tool.iconClass}`
      btn.setAttribute('aria-label', tool.label)
      btn.setAttribute('aria-pressed', 'false')
      btn.dataset.toolId = tool.id
      if (tool.id === 'save') {
        const badge = document.createElement('span')
        badge.className = 'ec-geometry-editor__tool-badge'
        badge.setAttribute('aria-hidden', 'true')
        badge.hidden = true
        btn.appendChild(badge)
      }
      btn.addEventListener('click', () => this.activate(tool))
      this.target.appendChild(btn)
    }
  }

  private clearFeatureCursor(): void {
    this.map.un('pointermove', this.onFeaturePointerMove)
    const target = this.map.getTargetElement()
    if (target) target.style.cursor = ''
  }

  private clearTransient(): void {
    const prev = this.activeId
    this.clearFeatureCursor()
    this.unbindMapHover()
    this.transform.setActive(false)
    if (this.draw) {
      this.map.removeInteraction(this.draw)
      this.draw = null
    }
    this.map.un('singleclick', this.onRemoveClick)
    this.activeId = null
    this.modify?.setActive(false)
    for (const btn of this.target.querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', 'false')
      btn.classList.remove('is-active')
    }
    if (prev && this.extraTools.some((t) => t.id === prev && t.mode === 'toggle')) {
      this.onExtraTool?.(prev, false)
    }
  }

  private activate(tool: ToolDef): void {
    if (tool.clearAll) {
      this.clearTransient()
      if (this.onClearAll) {
        this.onClearAll()
      } else {
        this.source.clear(true)
        this.onChange()
      }
      return
    }

    if (tool.action) {
      this.onExtraTool?.(tool.id, true)
      return
    }

    const already = this.activeId === tool.id
    this.clearTransient()
    if (already) return

    this.activeId = tool.id
    const btn = this.target.querySelector<HTMLButtonElement>(`button[data-tool-id="${tool.id}"]`)
    btn?.setAttribute('aria-pressed', 'true')
    btn?.classList.add('is-active')

    if (tool.extraToggle) {
      this.onExtraTool?.(tool.id, true)
      return
    }

    if (tool.modify) {
      this.transform.setMode(transformModeFor(this.geometryType))
      this.transform.setActive(true)
      // Sommets libres : ligne / polygone / point — pas pour Rectangle / Circle / Disc
      if (this.transform.usesVertexModify()) {
        this.modify?.setActive(true)
      }
      this.map.on('pointermove', this.onFeaturePointerMove)
      return
    }

    if (tool.remove) {
      this.map.on('pointermove', this.onFeaturePointerMove)
      this.map.on('singleclick', this.onRemoveClick)
      return
    }

    if (!tool.drawType) return

    const types = parseGeometryTypes(this.geometryType)
    const replaceOnDraw = shouldReplaceOnDraw(types)

    const sketchStyle =
      tool.circleKind === 'disc' || tool.circleKind === 'circle' ? discDrawStyle : this.drawStyle

    const drawStyle = this.wrapDrawStyle(this.customStyle ?? sketchStyle)

    this.draw = new Draw({
      source: this.source,
      type: tool.drawType,
      style: drawStyle,
      geometryFunction: tool.box ? createBox() : undefined,
    })
    this.draw.on('drawstart', () => {
      if (replaceOnDraw) this.source.clear(true)
    })
    this.draw.on('drawend', (evt) => {
      if (tool.circleKind) {
        setCircleKind(evt.feature, tool.circleKind)
      }
      queueMicrotask(() => {
        this.onFeatureCreated?.(evt.feature as OlFeature<OlGeometry>)
        this.onChange()
      })
    })
    this.map.addInteraction(this.draw)
    this.bindMapHover()
  }

  destroy(): void {
    this.clearTransient()
    this.transform.destroy()
    if (this.modify) this.map.removeInteraction(this.modify)
    if (this.snap) this.map.removeInteraction(this.snap)
    this.target.replaceChildren()
  }
}
