import { onMounted, onUnmounted, shallowRef, type Ref, type ShallowRef } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import { defaults as defaultControls } from 'ol/control'
import { fromLonLat } from 'ol/proj'
import type { Layer } from 'ol/layer'
import type BaseLayer from 'ol/layer/Base'

const DISPLAY_ONLY_CONTROL_SELECTOR = '.ol-attribution, .ol-scale-line'

/**
 * Attribution / échelle : affichage seul.
 * - OL pose pointer-events:auto inline et les monte dans ol-overlaycontainer-stopevent,
 *   ce qui bloque pointerdown et singleclick au-dessus de la zone transparente.
 * - On les déplace dans ol-overlaycontainer et on force pointer-events:none sur la racine.
 */
export function configureDisplayOnlyOlControls(map: Map): void {
  const passiveContainer = map.getOverlayContainer()
  const stopContainer = map.getOverlayContainerStopEvent()
  const nodes = map.getViewport().querySelectorAll(DISPLAY_ONLY_CONTROL_SELECTOR)
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    node.style.setProperty('pointer-events', 'none')
    if (node.parentElement === stopContainer) {
      passiveContainer.appendChild(node)
    }
  }
}

/** Centre approximatif de la France métropolitaine (comme gpu-client). */
export const FRANCE_CENTER = fromLonLat([2.424722, 46.763056])

export interface UseOlMapOptions {
  /** Élément cible (ref DOM). */
  target: Ref<HTMLElement | null>
  /** Zoom initial (gpu-client : 6). */
  zoom?: number
  minZoom?: number
  maxZoom?: number
  /** Couches initiales. */
  layers?: BaseLayer[]
}

export interface UseOlMapResult {
  map: ShallowRef<Map | null>
}

/**
 * Cycle de vie d'une carte OpenLayers (création / destruction),
 * inspiré de gpu.Viewer.
 */
export function useOlMap(options: UseOlMapOptions): UseOlMapResult {
  const map = shallowRef<Map | null>(null)

  onMounted(() => {
    const el = options.target.value
    if (!el) return

    const mapInstance = new Map({
      target: el,
      layers: (options.layers ?? []) as Layer[],
      controls: defaultControls({
        attribution: true,
        zoom: false,
        rotate: false,
        attributionOptions: { collapsible: false },
      }),
      view: new View({
        center: FRANCE_CENTER,
        zoom: options.zoom ?? 6,
        minZoom: options.minZoom ?? 5,
        maxZoom: options.maxZoom ?? 19,
        projection: 'EPSG:3857',
      }),
    })
    configureDisplayOnlyOlControls(mapInstance)
    mapInstance.getControls().on('add', () => configureDisplayOnlyOlControls(mapInstance))
    map.value = mapInstance
  })

  onUnmounted(() => {
    map.value?.setTarget(undefined)
    map.value = null
  })

  return { map }
}
