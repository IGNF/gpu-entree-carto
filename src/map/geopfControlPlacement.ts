import type Map from 'ol/Map'
import type { GeopfControlPosition } from '@/map/controlPositions'

let geopfSlotSeq = 0

/** Déplace un nœud DOM dans `.position-container-{corner}` (comme SketchControl). */
export function placeElementInGeopfContainer(
  map: Map,
  element: HTMLElement,
  corner: GeopfControlPosition,
  options?: { slotClass?: string; attempt?: number },
): void {
  const attempt = options?.attempt ?? 0
  const target = map.getTargetElement()
  if (!(target instanceof HTMLElement)) return
  const container = target.querySelector(`.position-container-${corner}`)
  if (!(container instanceof HTMLElement)) {
    if (attempt < 24) {
      requestAnimationFrame(() =>
        placeElementInGeopfContainer(map, element, corner, {
          ...options,
          attempt: attempt + 1,
        }),
      )
    }
    return
  }
  if (options?.slotClass) element.classList.add(options.slotClass)
  // geopf PanelManager lit `id.match(/(\w+)-[0-9]+/)[1]` de chaque enfant du conteneur : sans id,
  // l’ouverture d’un widget geopf du même côté (ex. « Sélectionner un territoire ») plante.
  if (!element.id) element.id = `ecGeopfSlot-${++geopfSlotSeq}`
  if (element.parentElement !== container) {
    container.appendChild(element)
  }
}
