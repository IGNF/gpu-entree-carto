/** Vue de la carte principale : lieu (centre, résolution, rotation) et couches visibles. */
export type PrintSourceViewKey = { location: string; layers: string }

/**
 * À la réouverture de la modale, faut-il recaler l’aperçu sur la vue de la carte principale ?
 * - lieu changé : toujours (même si l’aperçu avait été déplacé à la main) ;
 * - même lieu : seulement si l’aperçu n’a pas été personnalisé et que les couches ont changé.
 */
export function previewNeedsSourceViewResync(
  previous: PrintSourceViewKey | null,
  current: PrintSourceViewKey,
  previewCustomized: boolean,
): boolean {
  if (!previous) return false
  if (current.location !== previous.location) return true
  return !previewCustomized && current.layers !== previous.layers
}
