/**
 * Interaction carte en mode modification (forme / déplacement / rotation / style via la barre d’outils).
 * Rectangle (bbox) : poignées de redimensionnement aux coins et arêtes.
 */
import Feature from 'ol/Feature'
import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type { Coordinate } from 'ol/coordinate'
import type { Geometry as OlGeometry } from 'ol/geom'
import Circle from 'ol/geom/Circle'
import { LineString, Point, Polygon } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { getCenter, type Extent } from 'ol/extent'
import { unByKey } from 'ol/Observable'
import type { EventsKey } from 'ol/events'
import PointerInteraction from 'ol/interaction/Pointer'
import { Icon, Style } from 'ol/style'
import type { Feature as OlFeature } from 'ol'
import type VectorSourceType from 'ol/source/Vector'
import type VectorLayerType from 'ol/layer/Vector'
import { getCircleKind, isNearCircleEdge } from './circleHelpers'
import { parseGeometryTypes } from './geometryTypeUtils'
import { getSketchTextAttrs, isNearSketchText, isSketchTextFeature } from './sketch/SketchTextPopup'
import {
  applyFeatureHoverVisual,
  applyFeatureStyle,
  getFeatureStyleAttrs,
  restoreFeatureVisual,
} from './sketch/featureStyle'
import {
  SKETCH_MODIFY_ROTATE_CURSOR,
  SKETCH_MODIFY_ROTATE_GRABBING_CURSOR,
  SKETCH_MODIFY_TRANSLATE_CURSOR,
} from './sketchModifyCursors'

export type TransformMode = 'line-polygon' | 'bbox' | 'point' | 'circle' | 'disc'
export type ModifyEditMode = 'idle' | 'shape' | 'translate' | 'rotate' | 'style'

type HandleRole =
  | 'translate'
  | 'rotate'
  | 'resize-radius'
  | 'resize-nw'
  | 'resize-n'
  | 'resize-ne'
  | 'resize-e'
  | 'resize-se'
  | 'resize-s'
  | 'resize-sw'
  | 'resize-w'

const HANDLE_BLUE = '#000091'
const RESIZE_FILL = '#fff'
/** Tolérance de sélection pour lignes / labels texte (features fines). */
const LINE_TRANSLATE_HIT_PX = 10
const CIRCLE_EDGE_TOL_PX = 12
const SHAPE_VERTEX_HIT_PX = 10

const RESIZE_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="1" width="12" height="12" rx="1" fill="${RESIZE_FILL}" stroke="${HANDLE_BLUE}" stroke-width="2"/>
    </svg>`,
  )

function resizeHandleStyle(): Style {
  return new Style({
    image: new Icon({ src: RESIZE_ICON, anchor: [0.5, 0.5], scale: 1.2 }),
    zIndex: 1,
  })
}

function rotateCoordinate(coord: Coordinate, angle: number, origin: Coordinate): Coordinate {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = coord[0] - origin[0]
  const dy = coord[1] - origin[1]
  return [origin[0] + dx * cos - dy * sin, origin[1] + dx * sin + dy * cos]
}

function rotateGeometry(geom: OlGeometry, angle: number, origin: Coordinate): void {
  if (geom instanceof Point) {
    geom.setCoordinates(rotateCoordinate(geom.getCoordinates(), angle, origin))
    return
  }
  if (geom instanceof LineString) {
    geom.setCoordinates(geom.getCoordinates().map((c) => rotateCoordinate(c, angle, origin)))
    return
  }
  if (geom instanceof Polygon) {
    geom.setCoordinates(
      geom.getCoordinates().map((ring) => ring.map((c) => rotateCoordinate(c, angle, origin))),
    )
  }
}

function featureCentroid(geom: OlGeometry): Coordinate {
  return getCenter(geom.getExtent())
}

function angleBetween(origin: Coordinate, point: Coordinate): number {
  return Math.atan2(point[1] - origin[1], point[0] - origin[0])
}

function resolutionOf(map: Map): number {
  return map.getView().getResolution() ?? 1
}

function distPointToSegment(p: Coordinate, a: Coordinate, b: Coordinate): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function isNearGeometryVertex(
  feature: OlFeature<OlGeometry>,
  coord: Coordinate,
  res: number,
): boolean {
  const geom = feature.getGeometry()
  if (!geom) return false
  const tol = SHAPE_VERTEX_HIT_PX * res
  if (geom instanceof Point) return true
  if (geom instanceof LineString) {
    for (const c of geom.getCoordinates()) {
      if (distToCenter(c, coord) <= tol) return true
    }
    return false
  }
  if (geom instanceof Polygon) {
    const ring = geom.getLinearRing(0)
    if (!ring) return false
    for (const c of ring.getCoordinates()) {
      if (distToCenter(c, coord) <= tol) return true
    }
  }
  return false
}

function distToLineString(line: LineString, coord: Coordinate): number {
  const coords = line.getCoordinates()
  let min = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    min = Math.min(min, distPointToSegment(coord, coords[i], coords[i + 1]))
  }
  return min
}

function bboxPolygonFromExtent(extent: Extent): Polygon {
  const [minX, minY, maxX, maxY] = extent
  return new Polygon([
    [
      [minX, minY],
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY],
    ],
  ])
}

function applyBBoxResize(extent: Extent, role: HandleRole, coord: Coordinate): Extent {
  let [minX, minY, maxX, maxY] = extent
  const minSize = 1e-6
  switch (role) {
    case 'resize-nw':
      minX = Math.min(coord[0], maxX - minSize)
      maxY = Math.max(coord[1], minY + minSize)
      break
    case 'resize-n':
      maxY = Math.max(coord[1], minY + minSize)
      break
    case 'resize-ne':
      maxX = Math.max(coord[0], minX + minSize)
      maxY = Math.max(coord[1], minY + minSize)
      break
    case 'resize-e':
      maxX = Math.max(coord[0], minX + minSize)
      break
    case 'resize-se':
      maxX = Math.max(coord[0], minX + minSize)
      minY = Math.min(coord[1], maxY - minSize)
      break
    case 'resize-s':
      minY = Math.min(coord[1], maxY - minSize)
      break
    case 'resize-sw':
      minX = Math.min(coord[0], maxX - minSize)
      minY = Math.min(coord[1], maxY - minSize)
      break
    case 'resize-w':
      minX = Math.min(coord[0], maxX - minSize)
      break
    default:
      break
  }
  return [minX, minY, maxX, maxY]
}

function cursorForResizeRole(role: HandleRole): string {
  switch (role) {
    case 'resize-radius':
      return 'nesw-resize'
    case 'resize-n':
    case 'resize-s':
      return 'ns-resize'
    case 'resize-e':
    case 'resize-w':
      return 'ew-resize'
    case 'resize-ne':
    case 'resize-sw':
      return 'nesw-resize'
    case 'resize-nw':
    case 'resize-se':
      return 'nwse-resize'
    default:
      return 'pointer'
  }
}

function distToCenter(center: Coordinate, coord: Coordinate): number {
  return Math.hypot(coord[0] - center[0], coord[1] - center[1])
}

function featureSupportsRotation(feature: OlFeature<OlGeometry>, mode: TransformMode): boolean {
  const geom = feature.getGeometry()
  if (!geom) return false
  if (isSketchTextFeature(feature)) return true
  if (mode !== 'line-polygon') return false
  return geom instanceof LineString || geom instanceof Polygon
}

class TransformPointer extends PointerInteraction {
  constructor(ctrl: ModifyTransformController) {
    super({
      handleDownEvent: (evt) => ctrl.handleDown(evt),
      handleDragEvent: (evt) => ctrl.handleDrag(evt),
      handleUpEvent: (evt) => ctrl.handleUp(evt),
      handleMoveEvent: (evt) => ctrl.handleMove(evt),
    })
  }
}

export class ModifyTransformController {
  private readonly map: Map
  private readonly dataSource: VectorSourceType
  private readonly dataLayer: VectorLayerType
  private readonly onChange: () => void
  private readonly onStyleEdit:
    ((feature: OlFeature<OlGeometry>, anchor: Coordinate) => void) | null
  private readonly onStyleDismiss: (() => void) | null
  private readonly styleEditEnabled: boolean
  private mode: TransformMode
  private editMode: ModifyEditMode = 'shape'
  private active = false

  private readonly handleSource = new VectorSource({ wrapX: false })
  private readonly handleLayer: VectorLayer
  private readonly pointer: TransformPointer
  private hovered: OlFeature<OlGeometry> | null = null
  private hoverHighlighted: OlFeature<OlGeometry> | null = null
  private dragging: {
    role: HandleRole
    feature: OlFeature<OlGeometry>
    startCoord: Coordinate
    startGeom: OlGeometry
    origin: Coordinate
    startAngle: number
    startExtent: Extent
    startTextRotation: number
  } | null = null

  private readonly onViewChange = (): void => {
    if (!this.active || this.dragging || !this.hovered) return
    if (this.mode === 'bbox' && this.editMode === 'shape') {
      this.placeBBoxHandles(this.hovered)
    }
  }

  private styleSingleClickKey: EventsKey | null = null

  private readonly onStyleSingleClick = (evt: MapBrowserEvent): void => {
    if (!this.active || this.editMode !== 'style' || !this.styleEditEnabled) return
    const feature = this.findDataFeatureAtPixel(evt.pixel)
    if (feature) {
      this.onStyleEdit?.(feature, evt.coordinate)
      return
    }
    this.onStyleDismiss?.()
  }

  constructor(opts: {
    map: Map
    source: VectorSourceType
    layer: VectorLayerType
    mode: TransformMode
    onChange: () => void
    onStyleEdit?: (feature: OlFeature<OlGeometry>, anchor: Coordinate) => void
    onStyleDismiss?: () => void
  }) {
    this.map = opts.map
    this.dataSource = opts.source
    this.dataLayer = opts.layer
    this.mode = opts.mode
    this.onChange = opts.onChange
    this.onStyleEdit = opts.onStyleEdit ?? null
    this.onStyleDismiss = opts.onStyleDismiss ?? null
    this.styleEditEnabled = Boolean(opts.onStyleEdit)

    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      zIndex: 10000,
      className: 'ec-geometry-editor__transform-handles',
      style: () => resizeHandleStyle(),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    })
    this.handleLayer.set('ec-transform-handles', true)
    this.pointer = new TransformPointer(this)
  }

  setMode(mode: TransformMode): void {
    this.mode = mode
    this.clearHandles()
    this.hovered = null
  }

  setEditMode(mode: ModifyEditMode): void {
    if (this.editMode === 'style' && mode !== 'style') {
      this.onStyleDismiss?.()
    }
    this.clearHoverHighlight()
    this.editMode = mode
    this.clearHandles()
    this.hovered = null
    const el = this.map.getTargetElement()
    if (el) el.style.cursor = ''
    this.syncStyleSingleClickListener()
  }

  getEditMode(): ModifyEditMode {
    return this.editMode
  }

  setActive(active: boolean): void {
    if (this.active === active) return
    this.active = active
    if (active) {
      this.map.addLayer(this.handleLayer)
      this.map.addInteraction(this.pointer)
      this.map.getView().on('change:center', this.onViewChange)
      this.map.getView().on('change:resolution', this.onViewChange)
      this.map.on('change:size', this.onViewChange)
      this.syncStyleSingleClickListener()
    } else {
      this.syncStyleSingleClickListener()
      this.map.removeInteraction(this.pointer)
      this.map.removeLayer(this.handleLayer)
      this.map.getView().un('change:center', this.onViewChange)
      this.map.getView().un('change:resolution', this.onViewChange)
      this.map.un('change:size', this.onViewChange)
      this.clearHandles()
      this.clearHoverHighlight()
      this.hovered = null
      this.dragging = null
      this.onStyleDismiss?.()
      const el = this.map.getTargetElement()
      if (el) el.style.cursor = ''
    }
  }

  destroy(): void {
    this.setActive(false)
  }

  private syncStyleSingleClickListener(): void {
    if (this.styleSingleClickKey) {
      unByKey(this.styleSingleClickKey)
      this.styleSingleClickKey = null
    }
    if (this.active && this.editMode === 'style' && this.styleEditEnabled) {
      this.styleSingleClickKey = this.map.on('singleclick', this.onStyleSingleClick)
    }
  }

  usesVertexModify(): boolean {
    return this.mode === 'line-polygon' || this.mode === 'point'
  }

  private clearHandles(): void {
    this.handleSource.clear(true)
  }

  private usesHoverHighlight(): boolean {
    return this.editMode === 'translate' || this.editMode === 'rotate' || this.editMode === 'style'
  }

  private clearHoverHighlight(): void {
    if (!this.hoverHighlighted) return
    restoreFeatureVisual(this.hoverHighlighted)
    this.hoverHighlighted = null
  }

  private shouldHoverHighlightFeature(feature: OlFeature<OlGeometry>): boolean {
    if (this.editMode !== 'rotate') return true
    if (isSketchTextFeature(feature)) return true
    const geom = feature.getGeometry()
    if (geom instanceof Point) return false
    if (geom instanceof Circle && getCircleKind(feature) === 'disc') return false
    return featureSupportsRotation(feature, this.mode)
  }

  private syncHoverHighlight(feature: OlFeature<OlGeometry> | null): void {
    if (!feature || !this.usesHoverHighlight() || !this.shouldHoverHighlightFeature(feature)) {
      this.clearHoverHighlight()
      return
    }
    if (this.hoverHighlighted === feature) return
    if (this.hoverHighlighted) restoreFeatureVisual(this.hoverHighlighted)
    this.hoverHighlighted = feature
    applyFeatureHoverVisual(feature)
  }

  private isHandleFeature(feature: OlFeature): boolean {
    return Boolean(feature.get('role')) && this.handleSource.hasFeature(feature)
  }

  private findHandleAtPixel(pixel: number[]): OlFeature | null {
    let found: OlFeature | null = null
    this.map.forEachFeatureAtPixel(
      pixel,
      (feature) => {
        if (this.isHandleFeature(feature as OlFeature)) {
          found = feature as OlFeature
          return true
        }
        return undefined
      },
      {
        layerFilter: (layer) => layer === this.handleLayer,
        hitTolerance: 18,
      },
    )
    return found
  }

  private findDataFeatureAtPixel(pixel: number[]): OlFeature<OlGeometry> | null {
    let found: OlFeature<OlGeometry> | null = null
    this.map.forEachFeatureAtPixel(
      pixel,
      (feature) => {
        if (this.isHandleFeature(feature as OlFeature)) return undefined
        const f = feature as OlFeature<OlGeometry>
        if (!this.dataSource.hasFeature(f)) return undefined
        const geom = f.getGeometry()
        if (this.mode === 'bbox') {
          if (geom instanceof Polygon) {
            found = f
            return true
          }
          return undefined
        }
        if (this.mode === 'point') {
          if (geom instanceof Point) {
            found = f
            return true
          }
          return undefined
        }
        if (this.mode === 'circle' || this.mode === 'disc') {
          if (geom instanceof Circle) {
            found = f
            return true
          }
          return undefined
        }
        if (geom instanceof Circle) {
          found = f
          return true
        }
        const t = geom?.getType()
        if (t === 'LineString' || t === 'Polygon' || t === 'Point') {
          found = f
          return true
        }
        return undefined
      },
      {
        layerFilter: (layer) => layer === this.dataLayer,
        hitTolerance: 28,
      },
    )
    if (found) return found

    const coord = this.map.getCoordinateFromPixel(pixel)
    if (!coord) return null
    const res = resolutionOf(this.map)
    for (const f of this.dataSource.getFeatures()) {
      const feature = f as OlFeature<OlGeometry>
      if (!isNearSketchText(feature, coord, res)) continue
      if (this.mode === 'point' || this.mode === 'line-polygon') return feature
    }
    return null
  }

  private placeBBoxHandles(feature: OlFeature<OlGeometry>): void {
    this.clearHandles()
    const geom = feature.getGeometry()
    if (!(geom instanceof Polygon) || this.mode !== 'bbox') return
    const extent = geom.getExtent()
    const [minX, minY, maxX, maxY] = extent
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    const add = (role: HandleRole, coord: Coordinate): void => {
      const f = new Feature({ geometry: new Point(coord) })
      f.set('role', role)
      this.handleSource.addFeature(f)
    }
    add('resize-nw', [minX, maxY])
    add('resize-n', [midX, maxY])
    add('resize-ne', [maxX, maxY])
    add('resize-e', [maxX, midY])
    add('resize-se', [maxX, minY])
    add('resize-s', [midX, minY])
    add('resize-sw', [minX, minY])
    add('resize-w', [minX, midY])
  }

  private isNearHoveredCircleEdge(coord: Coordinate): boolean {
    const geom = this.hovered?.getGeometry()
    if (!(geom instanceof Circle)) return false
    const tol = CIRCLE_EDGE_TOL_PX * resolutionOf(this.map)
    return isNearCircleEdge(geom, coord, tol)
  }

  private canTranslateFeatureAt(feature: OlFeature<OlGeometry>, coord: Coordinate): boolean {
    const geom = feature.getGeometry()
    if (!geom || !coord) return false
    const res = resolutionOf(this.map)
    if (geom instanceof Point && isSketchTextFeature(feature)) {
      return isNearSketchText(feature, coord, res)
    }
    if (geom instanceof Point) return true
    if (geom instanceof LineString) {
      return distToLineString(geom, coord) <= LINE_TRANSLATE_HIT_PX * res
    }
    if (geom instanceof Polygon) {
      return geom.intersectsCoordinate(coord)
    }
    if (geom instanceof Circle) {
      return distToCenter(geom.getCenter(), coord) <= geom.getRadius()
    }
    return false
  }

  private updateCursor(
    el: HTMLElement,
    feature: OlFeature<OlGeometry> | null,
    coord: Coordinate | null,
  ): void {
    if (!feature || !coord) {
      el.style.cursor = ''
      return
    }
    if (this.editMode === 'style') {
      el.style.cursor = 'pointer'
      return
    }
    if (this.editMode === 'rotate') {
      if (featureSupportsRotation(feature, this.mode)) {
        el.style.cursor = SKETCH_MODIFY_ROTATE_CURSOR
      } else {
        el.style.cursor = ''
      }
      return
    }

    const geom = feature.getGeometry()

    if (this.editMode === 'shape') {
      if (isSketchTextFeature(feature)) {
        el.style.cursor = ''
        return
      }
      if (geom instanceof Circle && this.isNearHoveredCircleEdge(coord)) {
        el.style.cursor = cursorForResizeRole('resize-radius')
        return
      }
      const res = resolutionOf(this.map)
      if (isNearGeometryVertex(feature, coord, res)) {
        el.style.cursor = 'pointer'
        return
      }
      el.style.cursor = ''
      return
    }

    if (this.editMode === 'translate') {
      el.style.cursor = SKETCH_MODIFY_TRANSLATE_CURSOR
      return
    }

    el.style.cursor = ''
  }

  handleMove(evt: MapBrowserEvent): void {
    if (!this.active || this.dragging) return
    const el = this.map.getTargetElement()
    if (!el) return

    if (this.editMode === 'idle') {
      this.hovered = null
      this.clearHandles()
      this.clearHoverHighlight()
      el.style.cursor = ''
      return
    }

    if (this.editMode === 'shape' && this.mode === 'bbox') {
      const handle = this.findHandleAtPixel(evt.pixel)
      if (handle) {
        el.style.cursor = cursorForResizeRole(handle.get('role') as HandleRole)
        return
      }
    }

    const feature = this.findDataFeatureAtPixel(evt.pixel)
    if (feature) {
      this.hovered = feature
      if (this.editMode === 'shape' && this.mode === 'bbox') {
        this.placeBBoxHandles(feature)
      } else {
        this.clearHandles()
      }
      this.syncHoverHighlight(feature)
      this.updateCursor(el, feature, evt.coordinate)
      return
    }

    this.hovered = null
    this.clearHandles()
    this.clearHoverHighlight()
    el.style.cursor = ''
  }

  handleDown(evt: MapBrowserEvent): boolean {
    if (!this.active) return false
    if (this.editMode === 'idle') return false
    this.clearHoverHighlight()
    const coord = evt.coordinate
    if (!coord) return false
    const el = this.map.getTargetElement()

    if (this.editMode === 'style') {
      /* Clic feature : singleclick (après pointerup sans drag) — laisser le pan carte au drag. */
      return false
    }

    if (this.editMode === 'shape' && this.mode === 'bbox') {
      const handle = this.findHandleAtPixel(evt.pixel)
      if (handle && this.hovered) {
        const role = handle.get('role') as HandleRole
        const geom = this.hovered.getGeometry()
        if (!geom) return false
        this.dragging = {
          role,
          feature: this.hovered,
          startCoord: coord.slice() as Coordinate,
          startGeom: geom.clone(),
          origin: featureCentroid(geom),
          startAngle: 0,
          startExtent: geom.getExtent().slice() as Extent,
          startTextRotation: 0,
        }
        if (el) el.style.cursor = cursorForResizeRole(role)
        return true
      }
    }

    const feature = this.findDataFeatureAtPixel(evt.pixel) ?? this.hovered
    if (!feature) return false
    this.hovered = feature

    if (this.editMode === 'rotate') {
      if (!featureSupportsRotation(feature, this.mode)) return false
      const geom = feature.getGeometry()
      if (!geom) return false
      this.dragging = {
        role: 'rotate',
        feature,
        startCoord: coord.slice() as Coordinate,
        startGeom: geom.clone(),
        origin: featureCentroid(geom),
        startAngle: angleBetween(featureCentroid(geom), coord),
        startExtent: geom.getExtent().slice() as Extent,
        startTextRotation: isSketchTextFeature(feature) ? getSketchTextAttrs(feature).rotation : 0,
      }
      if (el) el.style.cursor = SKETCH_MODIFY_ROTATE_GRABBING_CURSOR
      return true
    }

    if (this.editMode === 'shape') {
      if (this.mode === 'point') return false
      if (feature && this.isNearHoveredCircleEdge(coord)) {
        const geom = feature.getGeometry()
        if (geom instanceof Circle) {
          this.dragging = {
            role: 'resize-radius',
            feature,
            startCoord: coord.slice() as Coordinate,
            startGeom: geom.clone(),
            origin: geom.getCenter().slice() as Coordinate,
            startAngle: 0,
            startExtent: geom.getExtent().slice() as Extent,
            startTextRotation: 0,
          }
          if (el) el.style.cursor = cursorForResizeRole('resize-radius')
          return true
        }
      }
      return false
    }

    if (this.editMode !== 'translate') return false

    if (!this.canTranslateFeatureAt(feature, coord)) return false
    const geom = feature.getGeometry()
    if (!geom) return false

    let origin: Coordinate
    if (geom instanceof Point) {
      origin = geom.getCoordinates().slice() as Coordinate
    } else if (geom instanceof Circle) {
      origin = geom.getCenter().slice() as Coordinate
    } else {
      origin = featureCentroid(geom)
    }

    this.dragging = {
      role: 'translate',
      feature,
      startCoord: coord.slice() as Coordinate,
      startGeom: geom.clone(),
      origin,
      startAngle: 0,
      startExtent: geom.getExtent().slice() as Extent,
      startTextRotation: isSketchTextFeature(feature) ? getSketchTextAttrs(feature).rotation : 0,
    }
    if (el) el.style.cursor = SKETCH_MODIFY_TRANSLATE_CURSOR
    return true
  }

  handleDrag(evt: MapBrowserEvent): void {
    if (!this.dragging) return
    const coord = evt.coordinate
    if (!coord) return

    const {
      role,
      feature,
      startCoord,
      startGeom,
      origin,
      startAngle,
      startExtent,
      startTextRotation,
    } = this.dragging

    if (role === 'translate') {
      const next = startGeom.clone()
      next.translate(coord[0] - startCoord[0], coord[1] - startCoord[1])
      feature.setGeometry(next)
      return
    }

    if (role === 'resize-radius' && startGeom instanceof Circle) {
      const next = startGeom.clone() as Circle
      next.setRadius(Math.max(distToCenter(origin, coord), 1e-3))
      feature.setGeometry(next)
      return
    }

    if (role === 'rotate' && startGeom instanceof Point && isSketchTextFeature(feature)) {
      const deltaDeg = ((angleBetween(origin, coord) - startAngle) * 180) / Math.PI
      const styleAttrs = getFeatureStyleAttrs(feature)
      applyFeatureStyle(feature, {
        ...styleAttrs,
        kind: 'text',
        rotation: startTextRotation - deltaDeg,
      })
      return
    }

    if (role === 'rotate' && this.mode === 'line-polygon') {
      const angle = angleBetween(origin, coord) - startAngle
      const next = startGeom.clone()
      rotateGeometry(next, angle, origin)
      feature.setGeometry(next)
      return
    }

    if (this.mode === 'bbox' && role.startsWith('resize-')) {
      feature.setGeometry(bboxPolygonFromExtent(applyBBoxResize(startExtent, role, coord)))
      this.placeBBoxHandles(feature)
    }
  }

  handleUp(_evt: MapBrowserEvent): boolean {
    if (!this.dragging) return false
    this.dragging = null
    this.onChange()
    const el = this.map.getTargetElement()
    if (el && this.hovered) {
      this.updateCursor(el, this.hovered, _evt.coordinate)
    }
    return false
  }
}

export function transformModeFor(geometryType: string): TransformMode {
  const types = parseGeometryTypes(geometryType)
  if (types.length !== 1) return 'line-polygon'
  const primary = types[0]
  if (primary === 'Rectangle') return 'bbox'
  if (primary === 'Point' || primary === 'MultiPoint') return 'point'
  if (primary === 'Circle' || primary === 'MultiCircle') return 'circle'
  if (primary === 'Disc' || primary === 'MultiDisc') return 'disc'
  return 'line-polygon'
}
