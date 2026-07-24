/**
 * Contrôles de transformation en mode modification :
 * - Ligne : poignées translation + rotation décalées sur le côté (bleu)
 * - Polygone : rotation (icône) ; translation en glissant l’intérieur (marge depuis les bords)
 * - Rectangle (bbox) : translation + redimensionnement coins / arêtes
 */
import Feature from 'ol/Feature'
import type Map from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import type { Coordinate } from 'ol/coordinate'
import type { Geometry as OlGeometry } from 'ol/geom'
import { LineString, Point, Polygon } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { getCenter, getHeight, getWidth, type Extent } from 'ol/extent'
import PointerInteraction from 'ol/interaction/Pointer'
import { Icon, Style } from 'ol/style'
import type { Feature as OlFeature } from 'ol'
import type VectorSourceType from 'ol/source/Vector'
import type VectorLayerType from 'ol/layer/Vector'

export type TransformMode = 'line-polygon' | 'bbox' | 'point'

type HandleRole =
  | 'translate'
  | 'rotate'
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
/** Échelle icônes translate / rotate (base SVG 24×24). */
const HANDLE_ICON_SCALE = 1.4
/**
 * Décalage latéral LineString (px) : demi-icône + 2 px → collé à la ligne
 * pour ne pas perdre le survol en allant vers les poignées.
 */
const LINE_SIDE_OFFSET_PX = 14
/** Écart vertical entre translate et rotate sur le côté (px). */
const LINE_HANDLE_GAP_PX = 32
/** Marge intérieure polygone / bbox pour démarrer une translation (px). */
const POLYGON_INNER_MARGIN_PX = 14
/** Zone de maintien des poignées autour d’une LineString (px). */
const LINE_HOVER_KEEP_PX = 28

const TRANSLATE_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="${HANDLE_BLUE}" d="M13 5.83V11h5.17l-1.59-1.59L18 8l4 4-4 4-1.41-1.41L18.17 13H13v5.17l1.59-1.59L16 18l-4 4-4-4 1.41-1.41L11 18.17V13H5.83l1.59 1.59L6 16l-4-4 4-4 1.41 1.41L5.83 11H11V5.83L9.41 7.41 8 6l4-4 4 4-1.41 1.41L13 5.83z"/>
    </svg>`,
  )

const ROTATE_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="${HANDLE_BLUE}" d="M12 5V1L7 6l5 5V7c2.76 0 5 2.24 5 5 0 .65-.13 1.28-.36 1.86l1.53 1.53C18.7 14.34 19 13.2 19 12c0-3.87-3.13-7-7-7zM6 12c0-.65.13-1.28.36-1.86L4.83 8.61C4.3 9.66 4 10.8 4 12c0 3.87 3.13 7 7 7v4l5-5-5-5v4c-2.76 0-5-2.24-5-5z"/>
    </svg>`,
  )

const RESIZE_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="1" width="12" height="12" rx="1" fill="${RESIZE_FILL}" stroke="${HANDLE_BLUE}" stroke-width="2"/>
    </svg>`,
  )

function styleForRole(role: HandleRole): Style {
  if (role === 'translate') {
    return new Style({
      image: new Icon({
        src: TRANSLATE_ICON,
        anchor: [0.5, 0.5],
        scale: HANDLE_ICON_SCALE,
      }),
      zIndex: 2,
    })
  }
  if (role === 'rotate') {
    return new Style({
      image: new Icon({
        src: ROTATE_ICON,
        anchor: [0.5, 0.5],
        scale: HANDLE_ICON_SCALE,
      }),
      zIndex: 2,
    })
  }
  return new Style({
    image: new Icon({ src: RESIZE_ICON, anchor: [0.5, 0.5], scale: 1.2 }),
    zIndex: 1,
  })
}

function rotateCoordinate(
  coord: Coordinate,
  angle: number,
  origin: Coordinate,
): Coordinate {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = coord[0] - origin[0]
  const dy = coord[1] - origin[1]
  return [origin[0] + dx * cos - dy * sin, origin[1] + dx * sin + dy * cos]
}

function rotateGeometry(
  geom: OlGeometry,
  angle: number,
  origin: Coordinate,
): void {
  if (geom instanceof Point) {
    geom.setCoordinates(rotateCoordinate(geom.getCoordinates(), angle, origin))
    return
  }
  if (geom instanceof LineString) {
    geom.setCoordinates(
      geom.getCoordinates().map((c) => rotateCoordinate(c, angle, origin)),
    )
    return
  }
  if (geom instanceof Polygon) {
    geom.setCoordinates(
      geom
        .getCoordinates()
        .map((ring) => ring.map((c) => rotateCoordinate(c, angle, origin))),
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

/** Distance point → segment. */
function distPointToSegment(
  p: Coordinate,
  a: Coordinate,
  b: Coordinate,
): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) {
    const ex = p[0] - a[0]
    const ey = p[1] - a[1]
    return Math.hypot(ex, ey)
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * True si le point est dans le polygone et à plus de `margin` (unités carte)
 * de tout bord extérieur.
 */
function isDeepInsidePolygon(
  poly: Polygon,
  coord: Coordinate,
  margin: number,
): boolean {
  if (!poly.intersectsCoordinate(coord)) return false
  const ring = poly.getLinearRing(0)
  if (!ring) return false
  const coords = ring.getCoordinates()
  for (let i = 0; i < coords.length - 1; i++) {
    if (distPointToSegment(coord, coords[i], coords[i + 1]) < margin) {
      return false
    }
  }
  return true
}

/** Ancrage des poignées collées à droite du milieu de la ligne. */
function lineSideAnchors(
  geom: LineString,
  res: number,
): { translate: Coordinate; rotate: Coordinate } {
  const coords = geom.getCoordinates()
  if (coords.length < 2) {
    const c = featureCentroid(geom)
    const x = c[0] + LINE_SIDE_OFFSET_PX * res
    const gap = LINE_HANDLE_GAP_PX * res
    return {
      translate: [x, c[1] + gap / 2],
      rotate: [x, c[1] - gap / 2],
    }
  }

  // Point milieu le long de la polyligne
  let total = 0
  const segLens: number[] = []
  for (let i = 0; i < coords.length - 1; i++) {
    const len = Math.hypot(
      coords[i + 1][0] - coords[i][0],
      coords[i + 1][1] - coords[i][1],
    )
    segLens.push(len)
    total += len
  }
  let target = total / 2
  let mid: Coordinate = coords[0]
  let tx = 1
  let ty = 0
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i] || i === segLens.length - 1) {
      const a = coords[i]
      const b = coords[i + 1]
      const t = segLens[i] > 0 ? target / segLens[i] : 0
      mid = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const len = Math.hypot(dx, dy) || 1
      // normale à droite
      tx = dy / len
      ty = -dx / len
      break
    }
    target -= segLens[i]
  }

  const off = LINE_SIDE_OFFSET_PX * res
  const base: Coordinate = [mid[0] + tx * off, mid[1] + ty * off]
  const gap = (LINE_HANDLE_GAP_PX * res) / 2
  // Empilement le long de la tangente
  const tangentX = -ty
  const tangentY = tx
  return {
    translate: [base[0] + tangentX * gap, base[1] + tangentY * gap],
    rotate: [base[0] - tangentX * gap, base[1] - tangentY * gap],
  }
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

function applyBBoxResize(
  extent: Extent,
  role: HandleRole,
  coord: Coordinate,
): Extent {
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

function cursorForRole(role: HandleRole): string {
  switch (role) {
    case 'translate':
      return 'move'
    case 'rotate':
      return 'grab'
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
  private mode: TransformMode
  private active = false

  private readonly handleSource = new VectorSource({ wrapX: false })
  private readonly handleLayer: VectorLayer
  private readonly pointer: TransformPointer
  private hovered: OlFeature<OlGeometry> | null = null
  private dragging: {
    role: HandleRole
    feature: OlFeature<OlGeometry>
    startCoord: Coordinate
    startGeom: OlGeometry
    origin: Coordinate
    startAngle: number
    startExtent: Extent
  } | null = null

  constructor(opts: {
    map: Map
    source: VectorSourceType
    layer: VectorLayerType
    mode: TransformMode
    onChange: () => void
  }) {
    this.map = opts.map
    this.dataSource = opts.source
    this.dataLayer = opts.layer
    this.mode = opts.mode
    this.onChange = opts.onChange

    this.handleLayer = new VectorLayer({
      source: this.handleSource,
      // Au-dessus des couches données / tuiles
      zIndex: 10000,
      className: 'ec-geometry-editor__transform-handles',
      style: (feature) => styleForRole(feature.get('role') as HandleRole),
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

  setActive(active: boolean): void {
    if (this.active === active) return
    this.active = active
    if (active) {
      this.map.addLayer(this.handleLayer)
      this.map.addInteraction(this.pointer)
    } else {
      this.map.removeInteraction(this.pointer)
      this.map.removeLayer(this.handleLayer)
      this.clearHandles()
      this.hovered = null
      this.dragging = null
      const el = this.map.getTargetElement()
      if (el) el.style.cursor = ''
    }
  }

  destroy(): void {
    this.setActive(false)
  }

  usesVertexModify(): boolean {
    return this.mode === 'line-polygon' || this.mode === 'point'
  }

  private clearHandles(): void {
    this.handleSource.clear(true)
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
        const t = geom?.getType()
        if (t === 'LineString' || t === 'Polygon') {
          found = f
          return true
        }
        return undefined
      },
      {
        layerFilter: (layer) => layer === this.dataLayer,
        hitTolerance: 10,
      },
    )
    return found
  }

  /**
   * @param rotateAt — pendant le drag de rotation, position de l’icône (= curseur)
   */
  private placeHandles(
    feature: OlFeature<OlGeometry>,
    opts?: { rotateAt?: Coordinate },
  ): void {
    this.clearHandles()
    const geom = feature.getGeometry()
    if (!geom) return

    const add = (role: HandleRole, coord: Coordinate): void => {
      const f = new Feature({ geometry: new Point(coord) })
      f.set('role', role)
      this.handleSource.addFeature(f)
    }

    const res = resolutionOf(this.map)

    if (this.mode === 'bbox' && geom instanceof Polygon) {
      const extent = geom.getExtent()
      const [minX, minY, maxX, maxY] = extent
      const midX = (minX + maxX) / 2
      const midY = (minY + maxY) / 2
      // Pas d’icône translate : même principe que polygone (drag intérieur)
      add('resize-nw', [minX, maxY])
      add('resize-n', [midX, maxY])
      add('resize-ne', [maxX, maxY])
      add('resize-e', [maxX, midY])
      add('resize-se', [maxX, minY])
      add('resize-s', [midX, minY])
      add('resize-sw', [minX, minY])
      add('resize-w', [minX, midY])
      return
    }

    if (this.mode !== 'line-polygon') return

    if (geom instanceof LineString) {
      const anchors = lineSideAnchors(geom, res)
      add('translate', anchors.translate)
      add('rotate', opts?.rotateAt ?? anchors.rotate)
      return
    }

    if (geom instanceof Polygon) {
      // Pas d’icône translate : translation = drag intérieur
      const center = featureCentroid(geom)
      const extent = geom.getExtent()
      const span = Math.max(getHeight(extent), getWidth(extent), 1)
      const defaultOffset = Math.max(span * 0.12, 36 * res)
      const rotateAt =
        opts?.rotateAt ?? ([center[0], center[1] + defaultOffset] as Coordinate)
      add('rotate', rotateAt)
    }
  }

  private isDeepInsideHoveredPolygon(coord: Coordinate): boolean {
    const geom = this.hovered?.getGeometry()
    if (!(geom instanceof Polygon)) return false
    const margin = POLYGON_INNER_MARGIN_PX * resolutionOf(this.map)
    return isDeepInsidePolygon(geom, coord, margin)
  }

  handleMove(evt: MapBrowserEvent): void {
    if (!this.active || this.dragging) return

    const handle = this.findHandleAtPixel(evt.pixel)
    const el = this.map.getTargetElement()
    if (handle) {
      if (el) el.style.cursor = cursorForRole(handle.get('role') as HandleRole)
      return
    }

    const feature = this.findDataFeatureAtPixel(evt.pixel)
    if (feature) {
      if (feature !== this.hovered) {
        this.hovered = feature
      }
      this.placeHandles(feature)

      const coord = evt.coordinate
      if (
        el &&
        coord &&
        (this.mode === 'line-polygon' || this.mode === 'bbox') &&
        this.isDeepInsideHoveredPolygon(coord)
      ) {
        el.style.cursor = 'move'
      } else if (el) {
        el.style.cursor = 'pointer'
      }
      return
    }

    // LineString : garder les poignées collées tant qu’on est près de la ligne
    // (évite de les perdre entre la feature et les icônes)
    const coord = evt.coordinate
    if (this.hovered && coord) {
      const geom = this.hovered.getGeometry()
      if (geom instanceof LineString) {
        const keep = LINE_HOVER_KEEP_PX * resolutionOf(this.map)
        if (distToLineString(geom, coord) <= keep) {
          this.placeHandles(this.hovered)
          if (el) el.style.cursor = 'pointer'
          return
        }
      }
    }

    this.hovered = null
    this.clearHandles()
    if (el) el.style.cursor = ''
  }

  handleDown(evt: MapBrowserEvent): boolean {
    if (!this.active || this.mode === 'point') return false
    const coord = evt.coordinate
    if (!coord) return false

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
        startAngle: angleBetween(featureCentroid(geom), coord),
        startExtent: geom.getExtent().slice() as Extent,
      }

      const el = this.map.getTargetElement()
      if (el) {
        el.style.cursor = role === 'rotate' ? 'grabbing' : cursorForRole(role)
      }
      return true
    }

    // Polygone / bbox : translation depuis l’intérieur (hors marge bord)
    if (
      (this.mode === 'line-polygon' || this.mode === 'bbox') &&
      this.hovered &&
      this.isDeepInsideHoveredPolygon(coord)
    ) {
      const geom = this.hovered.getGeometry()
      if (geom instanceof Polygon) {
        this.dragging = {
          role: 'translate',
          feature: this.hovered,
          startCoord: coord.slice() as Coordinate,
          startGeom: geom.clone(),
          origin: featureCentroid(geom),
          startAngle: 0,
          startExtent: geom.getExtent().slice() as Extent,
        }
        const el = this.map.getTargetElement()
        if (el) el.style.cursor = 'move'
        return true
      }
    }

    return false
  }

  handleDrag(evt: MapBrowserEvent): void {
    if (!this.dragging) return
    const coord = evt.coordinate
    if (!coord) return

    const { role, feature, startCoord, startGeom, origin, startAngle, startExtent } =
      this.dragging

    if (role === 'translate') {
      const next = startGeom.clone()
      next.translate(coord[0] - startCoord[0], coord[1] - startCoord[1])
      feature.setGeometry(next)
      this.placeHandles(feature)
      return
    }

    if (role === 'rotate' && this.mode === 'line-polygon') {
      const angle = angleBetween(origin, coord) - startAngle
      const next = startGeom.clone()
      rotateGeometry(next, angle, origin)
      feature.setGeometry(next)
      // L’icône de rotation suit le curseur
      this.placeHandles(feature, { rotateAt: coord })
      return
    }

    if (this.mode === 'bbox' && role.startsWith('resize-')) {
      feature.setGeometry(
        bboxPolygonFromExtent(applyBBoxResize(startExtent, role, coord)),
      )
      this.placeHandles(feature)
    }
  }

  handleUp(_evt: MapBrowserEvent): boolean {
    if (!this.dragging) return false
    const feature = this.dragging.feature
    this.dragging = null
    // Recaler les poignées (rotate revient à sa place relative)
    this.placeHandles(feature)
    this.onChange()
    return false
  }
}

export function transformModeFor(geometryType: string): TransformMode {
  if (geometryType === 'Rectangle') return 'bbox'
  if (geometryType === 'Point' || geometryType === 'MultiPoint') return 'point'
  return 'line-polygon'
}
