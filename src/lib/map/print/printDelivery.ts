/**
 * Remise du fichier exporté. Ordinateur : téléchargement direct. Téléphone / tablette (pointeur tactile)
 * avec partage de fichiers : feuille de partage (Enregistrer dans Fichiers, AirDrop…), ouverte par un geste
 * de l’utilisateur (le partage est refusé à la fin d’un export long, sans geste récent).
 */

/** Le navigateur peut partager ces fichiers et l’appareil est tactile. */
export function canShareExportFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  if (!window.matchMedia?.('(pointer: coarse)').matches) return false
  return typeof navigator.canShare === 'function' && navigator.canShare({ files })
}

/** Ouvre la feuille de partage ; à défaut (refus, non pris en charge), chaque fichier dans un nouvel onglet. */
export async function shareExportFiles(files: File[]): Promise<void> {
  try {
    await navigator.share({ files })
  } catch (err) {
    // Annulation par l’utilisateur : rien à faire.
    if (err instanceof DOMException && err.name === 'AbortError') return
    for (const file of files) window.open(URL.createObjectURL(file), '_blank')
  }
}
