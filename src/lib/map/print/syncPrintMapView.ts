import type View from 'ol/View'

export function copyViewState(from: View, to: View): void {
  to.setCenter(from.getCenter())
  to.setResolution(from.getResolution())
  to.setRotation(from.getRotation())
}
