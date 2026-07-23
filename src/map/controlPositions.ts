/**
 * Positions des contrôles — alignées sur
 * https://cartes.gouv.fr/explorer-les-cartes/
 * (IGNF/cartes.gouv.fr-entree-carto, useControlsExtensionPosition).
 */
export const CONTROL_POSITIONS = {
  zoom: 'bottom-right',
  fullscreen: 'bottom-right',
  /** ScaleLine OL : bas-droite, décalé via CSS. */
  scaleLine: 'bottom-right',
  /** SearchEngine (CSS top-left, pas de position geopf). */
  searchEngine: 'top-left',
  overviewMap: 'bottom-left',
  territories: 'bottom-left',
} as const

export type GeopfControlPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
