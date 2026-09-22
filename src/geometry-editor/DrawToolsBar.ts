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
import type { Coordinate } from 'ol/coordinate'
import type { Geometry as OlGeometry } from 'ol/geom'
import type { GeometryTypeOption } from './types'
import { discDrawStyle, geometryDrawStyle } from './styles'
import { getCircleKind, isNearCircleEdge, setCircleKind, type CircleKind } from './circleHelpers'
import {
  drawToolKeys,
  modifySubToolsVisibilityFor,
  parseGeometryTypes,
  shouldReplaceOnDraw,
  type GeometryTypeName,
} from './geometryTypeUtils'
import {
  ModifyTransformController,
  transformModeFor,
  type ModifyEditMode,
} from './ModifyTransformController'
import { ModifySubToolsBar, type ModifySubToolId } from './ModifySubToolsBar'
import { applyFeatureHoverVisual, restoreFeatureVisual } from './sketch/featureStyle'
import { isSketchTextFeature } from './sketch/SketchTextPopup'
import { appendGeometryToolIcon, updateSaveToolBadge } from './geometryToolIcons'

type DrawType = 'Point' | 'LineString' | 'Polygon' | 'Circle'

interface ToolDef {
  id: string
  label: string
  /** Modificateur BEM toolbar → icône Remix (`geometryToolIcons`) */
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
  actionPreservesTool?: boolean
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
  /** Clic action sans désactiver l’outil de dessin / modification en cours. */
  preserveActiveTool?: boolean
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
  private readonly modifySubToolsTarget: HTMLElement
  private readonly onChange: () => void
  private readonly onClearAll: (() => void) | null
  private readonly showClearAll: boolean
  private readonly extraTools: DrawBarExtraTool[]
  private readonly onExtraTool: ((id: string, active: boolean) => void) | null
  private readonly onFeatureCreated: ((feature: OlFeature<OlGeometry>) => void) | null
  private readonly onStyleDismiss: (() => void) | null
  private geometryType: GeometryTypeOption
  private drawStyle: StyleLike
  private customStyle: StyleLike | null | undefined
  private activeId: string | null = null
  private draw: Draw | null = null
  private modify: Modify | null = null
  private snap: Snap | null = null
  private readonly transform: ModifyTransformController
  private modifySubTools: ModifySubToolsBar | null = null
  /** Centre du disque/cercle en cours (1er clic) — fin de dessin seulement si rayon minimal. */
  private circleDrawCenter: Coordinate | null = null
  private removeHoverHighlighted: OlFeature<OlGeometry> | null = null

  private static readonly CIRCLE_MIN_RADIUS_PX = 3

  private circleMinRadiusMapUnits(): number {
    const res = this.map.getView().getResolution() ?? 1
    return DrawToolsBar.CIRCLE_MIN_RADIUS_PX * res
  }

  private isCircleDrawRadiusValid(geom: OlGeometry): boolean {
    if (!(geom instanceof Circle)) return true
    return geom.getRadius() >= this.circleMinRadiusMapUnits()
  }

  private circleFinishCondition(evt: MapBrowserEvent): boolean {
    if (!this.circleDrawCenter) return true
    const dx = evt.coordinate[0] - this.circleDrawCenter[0]
    const dy = evt.coordinate[1] - this.circleDrawCenter[1]
    const min = this.circleMinRadiusMapUnits()
    return dx * dx + dy * dy >= min * min
  }
  private readonly styleEditEnabled: boolean
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
  private findRemovableFeatureAt(evt: MapBrowserEvent): OlFeature<OlGeometry> | null {
    const res = this.map.getView().getResolution() ?? 1
    const edgeTol = this.removeEdgeTolPx * res
    const hits = this.map.getFeaturesAtPixel(evt.pixel, {
      layerFilter: (layer) => layer === this.layer,
      hitTolerance: this.removeEdgeTolPx,
    }) as OlFeature[]
    for (const feature of hits) {
      if (!this.source.hasFeature(feature)) continue
      const geom = feature.getGeometry()
      if (geom instanceof Circle && getCircleKind(feature) === 'circle') {
        if (!isNearCircleEdge(geom, evt.coordinate, edgeTol)) continue
      }
      return feature as OlFeature<OlGeometry>
    }
    return null
  }

  private clearRemoveHoverHighlight(): void {
    if (!this.removeHoverHighlighted) return
    restoreFeatureVisual(this.removeHoverHighlighted)
    this.removeHoverHighlighted = null
  }

  private syncRemoveHoverHighlight(feature: OlFeature<OlGeometry> | null): void {
    if (!feature) {
      this.clearRemoveHoverHighlight()
      return
    }
    if (this.removeHoverHighlighted === feature) return
    if (this.removeHoverHighlighted) restoreFeatureVisual(this.removeHoverHighlighted)
    this.removeHoverHighlighted = feature
    applyFeatureHoverVisual(feature)
  }

  private readonly onRemoveClick = (evt: MapBrowserEvent): void => {
    if (evt.dragging) return
    const feature = this.findRemovableFeatureAt(evt)
    if (!feature) return
    this.clearRemoveHoverHighlight()
    this.source.removeFeature(feature)
    this.onChange()
  }
  private readonly onFeaturePointerMove = (evt: MapBrowserEvent): void => {
    if (evt.dragging) return
    // En mode modify, le curseur est géré par ModifyTransformController
    if (this.activeId === 'modify') return
    const target = this.map.getTargetElement()
    if (!target) return

    if (this.activeId === 'remove') {
      const removable = this.findRemovableFeatureAt(evt)
      this.syncRemoveHoverHighlight(removable)
      target.style.cursor = removable ? 'pointer' : ''
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
    /** Barre séparée (à côté) pour translation / rotation / style. */
    modifySubToolsTarget: HTMLElement
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
    onStyleEdit?: (
      feature: OlFeature<OlGeometry>,
      anchor: import('ol/coordinate').Coordinate,
    ) => void
    onStyleDismiss?: () => void
  }) {
    this.map = opts.map
    this.source = opts.source
    this.layer = opts.layer
    this.geometryType = opts.geometryType
    this.target = opts.target
    this.modifySubToolsTarget = opts.modifySubToolsTarget
    this.onChange = opts.onChange
    this.showClearAll = Boolean(opts.clearAll)
    this.onClearAll = opts.onClearAll ?? null
    this.extraTools = opts.extraTools ?? []
    this.onExtraTool = opts.onExtraTool ?? null
    this.onFeatureCreated = opts.onFeatureCreated ?? null
    this.onStyleDismiss = opts.onStyleDismiss ?? null
    this.customStyle = opts.style
    this.styleEditEnabled = Boolean(opts.onStyleEdit)
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
      onStyleDismiss: opts.onStyleDismiss,
    })

    this.render()
    this.initModifySubTools()
  }

  private initModifySubTools(): void {
    this.modifySubTools?.destroy()
    this.modifySubTools = null
    if (!this.target.querySelector('button[data-tool-id="modify"]')) return
    const grouped = this.target.querySelector('.ec-geometry-editor__modify-group')
    if (grouped instanceof HTMLElement) {
      const modifyBtn = grouped.querySelector<HTMLButtonElement>('button[data-tool-id="modify"]')
      if (modifyBtn) grouped.replaceWith(modifyBtn)
    }
    this.modifySubTools = new ModifySubToolsBar(
      this.modifySubToolsTarget,
      this.target,
      (id, active) => this.applyModifySubTool(id, active),
      this.styleEditEnabled,
      modifySubToolsVisibilityFor(this.geometryType),
    )
  }

  private subToolToEditMode(id: ModifySubToolId): ModifyEditMode {
    switch (id) {
      case 'modify-shape':
        return 'shape'
      case 'modify-translate':
        return 'translate'
      case 'modify-rotate':
        return 'rotate'
      case 'modify-style':
        return 'style'
    }
  }

  private applyModifySubTool(id: ModifySubToolId, active: boolean): void {
    if (this.activeId !== 'modify') return
    if (!this.modifySubTools?.isSubToolAvailable(id)) return
    if (id === 'modify-style' && !this.styleEditEnabled) return
    if (!active) {
      this.transform.setEditMode('idle')
      this.modify?.setActive(false)
      return
    }
    const mode = this.subToolToEditMode(id)
    this.transform.setEditMode(mode)
    this.modify?.setActive(mode === 'shape' && this.transform.usesVertexModify())
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
    this.initModifySubTools()
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
      actionPreservesTool: t.preserveActiveTool,
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
      updateSaveToolBadge(badge, state)
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
      appendGeometryToolIcon(btn, tool.iconClass)
      if (tool.id === 'save') {
        const badge = document.createElement('span')
        badge.className = 'ec-geometry-editor__tool-badge'
        badge.setAttribute('aria-hidden', 'true')
        updateSaveToolBadge(badge, 'idle')
        btn.appendChild(badge)
      }
      btn.addEventListener('click', () => this.activate(tool))
      this.target.appendChild(btn)
    }
  }

  private clearFeatureCursor(): void {
    this.map.un('pointermove', this.onFeaturePointerMove)
    this.clearRemoveHoverHighlight()
    const target = this.map.getTargetElement()
    if (target) target.style.cursor = ''
  }

  private clearTransient(): void {
    const prev = this.activeId
    this.circleDrawCenter = null
    this.clearFeatureCursor()
    this.unbindMapHover()
    this.transform.setActive(false)
    this.modifySubTools?.setOpen(false)
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
      if (!tool.actionPreservesTool) this.clearTransient()
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
      this.onStyleDismiss?.()
      this.transform.setMode(transformModeFor(this.geometryType))
      this.modifySubTools?.setOpen(true)
      this.modifySubTools?.resetToDefaultSubTool()
      const defaultSub = this.modifySubTools?.getDefaultSubToolId() ?? 'modify-shape'
      this.applyModifySubTool(defaultSub, true)
      this.transform.setActive(true)
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
      finishCondition: tool.circleKind ? (evt) => this.circleFinishCondition(evt) : undefined,
    })
    this.draw.on('drawstart', (evt) => {
      if (replaceOnDraw) this.source.clear(true)
      this.circleDrawCenter = null
      if (tool.circleKind) {
        const g = evt.feature.getGeometry()
        if (g instanceof Circle) {
          this.circleDrawCenter = g.getCenter().slice() as Coordinate
        }
      }
    })
    this.draw.on('drawend', (evt) => {
      if (tool.circleKind) {
        setCircleKind(evt.feature, tool.circleKind)
      }
      const geom = evt.feature.getGeometry()
      if (tool.circleKind && geom instanceof Circle && !this.isCircleDrawRadiusValid(geom)) {
        this.source.removeFeature(evt.feature)
        return
      }
      this.circleDrawCenter = null
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
    this.modifySubTools?.destroy()
    this.transform.destroy()
    if (this.modify) this.map.removeInteraction(this.modify)
    if (this.snap) this.map.removeInteraction(this.snap)
    this.target.replaceChildren()
  }
}
