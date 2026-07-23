import { mountMapViewer, type MountedViewer } from '@/lib/mount'
import type { StandardViewerParams } from '@/lib/types'

const LOG_PREFIX = '[entree-carto]'

/**
 * Point d’entrée carte, compatible gpu.createStandardViewer (gpu-client).
 * Monte la carte dans #gpu-map-container.
 */
export function createStandardViewer(params: StandardViewerParams = {}): MountedViewer | null {
  const container = document.getElementById('gpu-map-container')
  if (!container) {
    console.error(`${LOG_PREFIX} #gpu-map-container introuvable`)
    return null
  }

  if (params.document) {
    console.info(`${LOG_PREFIX} document reçu (aperçu partiel)`, params.document)
  }
  if (params.search?.fullText) {
    console.info(`${LOG_PREFIX} recherche initiale`, params.search)
  }

  console.warn(
    `${LOG_PREFIX} createStandardViewer : version initiale — couches métier, fiche info, outils et aide non disponibles.`,
  )

  return mountMapViewer(container, params)
}
