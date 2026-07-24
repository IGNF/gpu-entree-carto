import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type VectorLayer from 'ol/layer/Vector'
import type VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import Circle from 'ol/geom/Circle'
import Draw, { createBox } from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Select from 'ol/interaction/Select'
import Snap from 'ol/interaction/Snap'
import { click } from 'ol/events/condition'
import type { GeometryTypeOption } from './types'
import {
  circleDrawStyle,
  discDrawStyle,
  geometryDrawStyle,
} from './styles'
import { setCircleKind, type CircleKind } from './circleHelpers'
import {
  drawToolKeys,
  parseGeometryTypes,
  shouldReplaceOnDraw,
  type GeometryTypeName,
} from './geometryTypeUtils'
import {
  ModifyTransformController,
  transformModeFor,
} from './ModifyTransformController'

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
}

const modifyTool: ToolDef = {
  id: 'modify',
  label: 'modifier une géométrie',
  iconClass: 'ec-geometry-editor__tool--modify',
  modify: true,
}

const removeTool: ToolDef = {
  id: 'remove',
  label: 'Supprimer une géométrie',
  iconClass: 'ec-geometry-editor__tool--remove',
  remove: true,
}

const DRAW_TOOL_DEFS: Record<
  ReturnType<typeof drawToolKeys>[number],
  ToolDef
> = {
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
  Circle: {
    id: 'circle',
    label: 'Cercle',
    iconClass: 'ec-geometry-editor__tool--circle',
    drawType: 'Circle',
    circleKind: 'circle',
  },
  Disc: {
    id: 'disc',
    label: 'Disque',
    iconClass: 'ec-geometry-editor__tool--disc',
    drawType: 'Circle',
    circleKind: 'disc',
  },
}

function drawStyleFor(types: GeometryTypeName[]): StyleLike {
  if (types.length === 1 && types[0] === 'Circle') return circleDrawStyle
  if (types.length === 1 && types[0] === 'Disc') return discDrawStyle
  if (types.length === 1 && types[0] === 'MultiCircle') return circleDrawStyle
  if (types.length === 1 && types[0] === 'MultiDisc') return discDrawStyle
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
  private geometryType: GeometryTypeOption
  private drawStyle: StyleLike
  private customStyle: StyleLike | null | undefined
  private activeId: string | null = null
  private draw: Draw | null = null
  private modify: Modify | null = null
  private select: Select | null = null
  private snap: Snap | null = null
  private readonly transform: ModifyTransformController
  private readonly onFeaturePointerMove = (evt: MapBrowserEvent): void => {
    if (evt.dragging) return
    // En mode modify, le curseur est géré par ModifyTransformController
    if (this.activeId === 'modify') return
    const hit = this.map.hasFeatureAtPixel(evt.pixel, {
      layerFilter: (layer) => layer === this.layer,
      hitTolerance: 12,
    })
    const target = this.map.getTargetElement()
    if (target) {
      target.style.cursor = hit ? 'pointer' : ''
    }
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
  }) {
    this.map = opts.map
    this.source = opts.source
    this.layer = opts.layer
    this.geometryType = opts.geometryType
    this.target = opts.target
    this.onChange = opts.onChange
    this.customStyle = opts.style
    this.drawStyle =
      opts.style ?? drawStyleFor(parseGeometryTypes(opts.geometryType))

    this.modify = new Modify({
      source: this.source,
      // Cercle / disque : gérés par ModifyTransformController (rayon / translation)
      filter: (feature) => !(feature.getGeometry() instanceof Circle),
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
    this.drawStyle =
      style ?? drawStyleFor(parseGeometryTypes(this.geometryType))
  }

  private render(): void {
    this.target.replaceChildren()
    for (const tool of toolsFor(this.geometryType)) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `ec-geometry-editor__tool ${tool.iconClass}`
      btn.title = tool.label
      btn.setAttribute('aria-label', tool.label)
      btn.setAttribute('aria-pressed', 'false')
      btn.dataset.toolId = tool.id
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
    this.clearFeatureCursor()
    this.transform.setActive(false)
    if (this.draw) {
      this.map.removeInteraction(this.draw)
      this.draw = null
    }
    if (this.select) {
      this.map.removeInteraction(this.select)
      this.select = null
    }
    this.activeId = null
    this.modify?.setActive(false)
    for (const btn of this.target.querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', 'false')
      btn.classList.remove('is-active')
    }
  }

  private activate(tool: ToolDef): void {
    const already = this.activeId === tool.id
    this.clearTransient()
    if (already) return

    this.activeId = tool.id
    const btn = this.target.querySelector<HTMLButtonElement>(
      `button[data-tool-id="${tool.id}"]`,
    )
    btn?.setAttribute('aria-pressed', 'true')
    btn?.classList.add('is-active')

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
      this.select = new Select({
        condition: click,
        hitTolerance: 12,
        layers: [this.layer],
        style: null,
      })
      this.select.on('select', (e) => {
        const selected = [...e.selected]
        for (const f of selected) {
          if (this.source.hasFeature(f)) {
            this.source.removeFeature(f)
          }
        }
        this.select?.getFeatures().clear()
        this.onChange()
      })
      this.map.addInteraction(this.select)
      return
    }

    if (!tool.drawType) return

    const types = parseGeometryTypes(this.geometryType)
    const replaceOnDraw = shouldReplaceOnDraw(types)

    const sketchStyle =
      tool.circleKind === 'circle'
        ? circleDrawStyle
        : tool.circleKind === 'disc'
          ? discDrawStyle
          : this.drawStyle

    this.draw = new Draw({
      source: this.source,
      type: tool.drawType,
      style: this.customStyle ?? sketchStyle,
      geometryFunction: tool.box ? createBox() : undefined,
    })
    this.draw.on('drawstart', () => {
      if (replaceOnDraw) this.source.clear(true)
    })
    this.draw.on('drawend', (evt) => {
      if (tool.circleKind) {
        setCircleKind(evt.feature, tool.circleKind)
      }
      queueMicrotask(() => this.onChange())
    })
    this.map.addInteraction(this.draw)
  }

  destroy(): void {
    this.clearTransient()
    this.transform.destroy()
    if (this.modify) this.map.removeInteraction(this.modify)
    if (this.snap) this.map.removeInteraction(this.snap)
    this.target.replaceChildren()
  }
}
