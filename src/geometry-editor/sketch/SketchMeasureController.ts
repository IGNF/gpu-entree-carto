import type OlMap from 'ol/Map'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import Overlay from 'ol/Overlay'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Draw from 'ol/interaction/Draw'
import type { Feature as OlFeature } from 'ol'
import type { LineString, Polygon } from 'ol/geom'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'
import CircleStyle from 'ol/style/Circle'
import { formatMapArea, formatMapLength, measureAnchor } from './measureFormat'

const MEASURE_STYLE = new Style({
  fill: new Fill({ color: 'rgba(0, 0, 145, 0.08)' }),
  stroke: new Stroke({
    color: '#000091',
    width: 2,
    lineDash: [8, 8],
  }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: '#000091' }),
  }),
})

/**
 * Outils de mesure sur couche dédiée `measureLayer`
 * (LineString / Polygon en tirets + popup style localisation geopf).
 */
export class SketchMeasureController {
  readonly layer: VectorLayer
  private readonly source: VectorSource
  private draw: Draw | null = null
  private readonly overlays = new globalThis.Map<OlFeature, Overlay>()
  private mode: 'distance' | 'area' | null = null
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

  constructor(
    private readonly map: OlMap,
    zIndex = 510,
  ) {
    this.source = new VectorSource({ wrapX: false })
    this.layer = new VectorLayer({
      source: this.source,
      style: MEASURE_STYLE,
      zIndex,
      className: 'ec-sketch-measure-layer',
      properties: { 'ec-measure': true },
    })
    map.addLayer(this.layer)
  }

  isActive(): boolean {
    return this.mode !== null
  }

  getMode(): 'distance' | 'area' | null {
    return this.mode
  }

  activate(mode: 'distance' | 'area'): void {
    this.deactivateDraw()
    this.mode = mode
    this.pointerOnMap = true
    this.draw = new Draw({
      source: this.source,
      type: mode === 'distance' ? 'LineString' : 'Polygon',
      style: () => (this.pointerOnMap ? MEASURE_STYLE : []),
    })
    this.draw.on('drawend', (evt) => {
      const feature = evt.feature
      queueMicrotask(() => this.attachLabel(feature))
    })
    this.map.addInteraction(this.draw)
    const el = this.map.getTargetElement()
    if (el && !this.mapHoverBound) {
      el.addEventListener('pointerenter', this.onMapPointerEnter)
      el.addEventListener('pointerleave', this.onMapPointerLeave)
      this.mapHoverBound = true
    }
  }

  /** Désactive le dessin ; conserve les mesures déjà tracées. */
  deactivateDraw(): void {
    if (this.mapHoverBound) {
      const el = this.map.getTargetElement()
      el?.removeEventListener('pointerenter', this.onMapPointerEnter)
      el?.removeEventListener('pointerleave', this.onMapPointerLeave)
      this.mapHoverBound = false
      this.pointerOnMap = true
    }
    if (this.draw) {
      this.map.removeInteraction(this.draw)
      this.draw = null
    }
    this.mode = null
  }

  clear(): void {
    this.deactivateDraw()
    for (const overlay of this.overlays.values()) {
      this.map.removeOverlay(overlay)
    }
    this.overlays.clear()
    this.source.clear(true)
  }

  destroy(): void {
    this.clear()
    this.map.removeLayer(this.layer)
  }

  private attachLabel(feature: OlFeature): void {
    const geom = feature.getGeometry()
    if (!geom) return
    const type = geom.getType()
    if (type !== 'LineString' && type !== 'Polygon') return

    const root = document.createElement('div')
    // Même forme que la popup localisation geopf (GPSearchPopup).
    root.className = 'GPSearchPopup ec-sketch-measure-popup'

    const content = document.createElement('div')
    content.className = 'GPPopupContent ec-sketch-measure-popup__content'
    content.textContent = this.formatFeature(feature)

    const btns = document.createElement('div')
    btns.className = 'GPButtonGroups gpf-btns-group'

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.title = remove.ariaLabel = 'Supprimer la mesure'
    remove.textContent = 'Supprimer'
    remove.className =
      'GPButton gpf-btn fr-icon-delete-line fr-btn fr-btn--sm gpf-btn--tertiary fr-btn--tertiary-no-outline'

    btns.appendChild(remove)
    root.appendChild(content)
    root.appendChild(btns)

    const overlay = new Overlay({
      element: root,
      positioning: 'bottom-center',
      offset: [0, -8],
      stopEvent: true,
    })
    overlay.setPosition(measureAnchor(this.map, geom as LineString | Polygon))
    this.map.addOverlay(overlay)
    this.overlays.set(feature, overlay)

    remove.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.removeFeature(feature)
    })

    feature.getGeometry()?.on('change', () => {
      const g = feature.getGeometry()
      if (!g) return
      content.textContent = this.formatFeature(feature)
      overlay.setPosition(measureAnchor(this.map, g as LineString | Polygon))
    })
  }

  private formatFeature(feature: OlFeature): string {
    const geom = feature.getGeometry()
    if (!geom) return ''
    if (geom.getType() === 'LineString') {
      return formatMapLength(this.map, geom as LineString)
    }
    if (geom.getType() === 'Polygon') {
      return formatMapArea(this.map, geom as Polygon)
    }
    return ''
  }

  private removeFeature(feature: OlFeature): void {
    const overlay = this.overlays.get(feature)
    if (overlay) {
      this.map.removeOverlay(overlay)
      this.overlays.delete(feature)
    }
    if (this.source.hasFeature(feature)) {
      this.source.removeFeature(feature)
    }
  }

  /** Clic pour supprimer une mesure (outil remove dédié optionnel). */
  removeAtPixel(evt: MapBrowserEvent): boolean {
    const hits = this.map.getFeaturesAtPixel(evt.pixel, {
      layerFilter: (l) => l === this.layer,
      hitTolerance: 10,
    }) as OlFeature[]
    const feature = hits[0]
    if (!feature || !this.source.hasFeature(feature)) return false
    this.removeFeature(feature)
    return true
  }
}
