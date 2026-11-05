import type Map from 'ol/Map'
import type { GeopfControlPosition } from '@/map/controlPositions'

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
  if (element.parentElement !== container) {
    container.appendChild(element)
  }
}
