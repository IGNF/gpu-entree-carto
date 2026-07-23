/**
 * Positions des contrôles de base — alignées sur
 * https://cartes.gouv.fr/explorer-les-cartes/
 * (repo IGNF/cartes.gouv.fr-entree-carto, useControlsExtensionPosition).
 */
export const CONTROL_POSITIONS = {
  zoom: 'bottom-right',
  fullscreen: 'bottom-right',
  /** ScaleLine OL : bas-droite, décalé via CSS (pas d’option position geopf). */
  scaleLine: 'bottom-right',
} as const

export type GeopfControlPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
