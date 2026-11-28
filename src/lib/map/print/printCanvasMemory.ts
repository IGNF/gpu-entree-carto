/**
 * Mémoire des toiles d’export (iOS Safari : plafond global ~384 Mo de toiles, ~16,7 Mpx par toile).
 * Au-delà, Safari ne lève pas d’erreur : la toile ne dessine rien.
 */

export const PRINT_CANVAS_TOO_LARGE_MESSAGE =
  'Image trop grande pour cet appareil. Choisissez un format papier plus petit ou moins d’annexes.'

/** Libère la mémoire d’une toile (iOS ne la rend que si la taille repasse à 0). */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
  canvas.remove()
}

/** Vérifie qu’une toile neuve dessine vraiment (coin bas-droit) ; sinon erreur explicite. */
export function assertCanvasUsable(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width || !canvas.height) throw new Error(PRINT_CANVAS_TOO_LARGE_MESSAGE)
  const x = canvas.width - 1
  const y = canvas.height - 1
  ctx.fillStyle = '#ff0000'
  ctx.fillRect(x, y, 1, 1)
  const drawn = ctx.getImageData(x, y, 1, 1).data[0] === 255
  ctx.clearRect(x, y, 1, 1)
  if (!drawn) throw new Error(PRINT_CANVAS_TOO_LARGE_MESSAGE)
  return ctx
}
