import { mountMapViewer } from '@/lib/mount'
import type { ParcelViewerOptions } from '@/lib/types'

const LOG_PREFIX = '[entree-carto]'

/**
 * Stub compatible gpu.ParcelViewer — fiche parcelle non implémentée.
 */
export class ParcelViewer {
  private readonly options: ParcelViewerOptions

  constructor(options: ParcelViewerOptions = {}) {
    this.options = options
  }

  init(parcelId: string): void {
    console.warn(
      `${LOG_PREFIX} ParcelViewer.init(${parcelId}) : fiche parcelle non implémentée — carte minimale uniquement.`,
    )

    const container = document.getElementById('gpu-map-container')
    if (!container) {
      console.error(`${LOG_PREFIX} #gpu-map-container introuvable`)
      return
    }

    mountMapViewer(container, {
      layerConfig: this.options.layerConfig,
      legendConfig: this.options.legendConfig,
      duCategories: this.options.duCategories,
      supCategories: this.options.supCategories,
      document: { id: parcelId, type: 'parcel' },
    })
  }
}
