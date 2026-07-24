import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type VectorLayer from 'ol/layer/Vector'
import type VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import Draw, { createBox } from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Select from 'ol/interaction/Select'
import Snap from 'ol/interaction/Snap'
import { click } from 'ol/events/condition'
import type { GeometryTypeOption } from './types'
import { geometryDrawStyle } from './styles'
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
  modify?: boolean
  remove?: boolean
}

const modifyTool: ToolDef = {
  id: 'modify',
  label: 'Modifier une géométrie',
  iconClass: 'ec-geometry-editor__tool--modify',
  modify: true,
}

const removeTool: ToolDef = {
  id: 'remove',
  label: 'Supprimer une géométrie',
  iconClass: 'ec-geometry-editor__tool--remove',
  remove: true,
}

function toolsFor(geometryType: GeometryTypeOption): ToolDef[] {
  if (geometryType === 'Geometry') {
    return [
      {
        id: 'point',
        label: 'Point',
        iconClass: 'ec-geometry-editor__tool--point',
        drawType: 'Point',
      },
      {
        id: 'line',
        label: 'Ligne',
        iconClass: 'ec-geometry-editor__tool--line',
        drawType: 'LineString',
      },
      {
        id: 'polygon',
        label: 'Polygone',
        iconClass: 'ec-geometry-editor__tool--polygon',
        drawType: 'Polygon',
      },
      modifyTool,
      removeTool,
    ]
  }
  if (geometryType === 'Rectangle') {
    return [
      {
        id: 'rect',
        label: 'Rectangle',
        iconClass: 'ec-geometry-editor__tool--rectangle',
        drawType: 'Circle',
        box: true,
      },
      modifyTool,
      removeTool,
    ]
  }
  const simple = geometryType.replace(/^Multi/, '') as DrawType
  const iconClass =
    simple === 'Point'
      ? 'ec-geometry-editor__tool--point'
      : simple === 'LineString'
        ? 'ec-geometry-editor__tool--line'
        : 'ec-geometry-editor__tool--polygon'
  return [
    {
      id: 'draw',
      label: geometryType,
      iconClass,
      drawType:
        simple === 'Point' || simple === 'LineString' || simple === 'Polygon'
          ? simple
          : 'Polygon',
    },
    modifyTool,
    removeTool,
  ]
}

export class DrawToolsBar {
  private readonly map: Map
  private readonly source: VectorSource
  private readonly layer: VectorLayer
  private readonly target: HTMLElement
  private readonly onChange: () => void
  private geometryType: GeometryTypeOption
  private drawStyle: StyleLike
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
    this.drawStyle = opts.style ?? geometryDrawStyle

    this.modify = new Modify({ source: this.source })
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
    this.render()
  }

  /** Met à jour le style du croquis en cours. */
  setStyle(style: StyleLike | null | undefined): void {
    this.clearTransient()
    this.drawStyle = style ?? geometryDrawStyle
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
      // Sommets libres : ligne / polygone / point — pas pour Rectangle (bbox)
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

    const replaceOnDraw =
      this.geometryType === 'Point' ||
      this.geometryType === 'LineString' ||
      this.geometryType === 'Polygon' ||
      this.geometryType === 'Rectangle'

    this.draw = new Draw({
      source: this.source,
      type: tool.drawType,
      style: this.drawStyle,
      geometryFunction: tool.box ? createBox() : undefined,
    })
    this.draw.on('drawstart', () => {
      if (replaceOnDraw) this.source.clear(true)
    })
    this.draw.on('drawend', () => {
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
