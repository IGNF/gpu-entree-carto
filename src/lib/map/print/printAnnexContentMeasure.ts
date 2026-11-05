import type { ParcelLegendScaleBand } from '@/lib/fiche/parcelLegendImage'
import type { PrintPreviewPageKind } from '@/lib/map/print/printPageTypes'

/** Contenu annexes : ce qui peut invalider la pagination (hors gabarit papier / DPI). */
export type AnnexContentMeasureSnapshot = {
  territoryTabCount: number
  parcelInfosLength: number
  parcelDocumentsLength: number
  parcelLegendScale: ParcelLegendScaleBand
  legendsIncludeAll: boolean
  /** Null si « Toutes les légendes » (contenu indépendant du zoom aperçu). */
  legendPreviewZoom: number | null
  legendLayerIds: string
  legendItemCount: number
}

export type BuildAnnexContentMeasureSnapshotInput = {
  territoryTabCount: number
  parcelInfosLength: number
  parcelDocumentsLength: number
  parcelLegendScale: ParcelLegendScaleBand
  legendsIncludeAll: boolean
  legendPreviewZoom: number
  legendLayerIds: string
  legendItemCount: number
}

export function buildAnnexContentMeasureSnapshot(
  input: BuildAnnexContentMeasureSnapshotInput,
): AnnexContentMeasureSnapshot {
  return {
    territoryTabCount: input.territoryTabCount,
    parcelInfosLength: input.parcelInfosLength,
    parcelDocumentsLength: input.parcelDocumentsLength,
    parcelLegendScale: input.parcelLegendScale,
    legendsIncludeAll: input.legendsIncludeAll,
    legendPreviewZoom: input.legendsIncludeAll ? null : input.legendPreviewZoom,
    legendLayerIds: input.legendLayerIds,
    legendItemCount: input.legendItemCount,
  }
}

/** Annexes dont le contenu affiché a changé (null = premier passage, pas d’invalidation). */
export function annexKindsToInvalidateForContentChange(
  previous: AnnexContentMeasureSnapshot | null,
  next: AnnexContentMeasureSnapshot,
): PrintPreviewPageKind[] {
  if (!previous) return []
  const kinds: PrintPreviewPageKind[] = []
  if (previous.territoryTabCount !== next.territoryTabCount) {
    kinds.push('ficheTerritory')
  }
  if (
    previous.parcelInfosLength !== next.parcelInfosLength ||
    previous.parcelDocumentsLength !== next.parcelDocumentsLength ||
    previous.parcelLegendScale !== next.parcelLegendScale
  ) {
    kinds.push('ficheParcel')
  }
  if (
    previous.legendsIncludeAll !== next.legendsIncludeAll ||
    previous.legendPreviewZoom !== next.legendPreviewZoom ||
    previous.legendLayerIds !== next.legendLayerIds ||
    previous.legendItemCount !== next.legendItemCount
  ) {
    kinds.push('legends')
  }
  return kinds
}
