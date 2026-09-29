import { shallowRef } from 'vue'

/** `true` tant qu’un outil croquis est actif (dessin, modification, mesure, texte…). */
export const sketchToolEngagedRef = shallowRef(false)

export function setSketchToolEngaged(engaged: boolean): void {
  sketchToolEngagedRef.value = engaged
}
