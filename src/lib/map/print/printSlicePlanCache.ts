import type { PrintPreviewPageKind } from '@/lib/map/print/printPageTypes'
import type { PrintTemplateMeasureContext } from '@/lib/map/print/printTemplates'

export type SupplementContentFingerprints = {
  territoryTabCount: number
  parcelInfosLength: number
  parcelDocumentsLength: number
  /** Pictos règles parcelle (-lowscale / -highscale), pas le zoom continu. */
  parcelLegendScale: 'lowscale' | 'highscale'
  legendsIncludeAll: boolean
  legendPreviewZoom: number
  legendLayerIds: string
  legendItemCount: number
}

export function supplementContentSuffixForKind(
  kind: PrintPreviewPageKind,
  fingerprints: SupplementContentFingerprints,
): string {
  if (kind === 'ficheTerritory') {
    return `t:${fingerprints.territoryTabCount}`
  }
  if (kind === 'ficheParcel') {
    return `p:${fingerprints.parcelInfosLength}:${fingerprints.parcelDocumentsLength}|${fingerprints.parcelLegendScale}`
  }
  if (fingerprints.legendsIncludeAll) {
    return `l:all:${fingerprints.legendLayerIds}|n:${fingerprints.legendItemCount}`
  }
  return `l:${fingerprints.legendLayerIds}|n:${fingerprints.legendItemCount}|z:${fingerprints.legendPreviewZoom}`
}

export function buildSupplementSlicePlanCacheKey(
  kind: PrintPreviewPageKind,
  layout: PrintTemplateMeasureContext,
  contentSuffix: string,
): string {
  const { innerWidthPx, innerHeightPx } = layout.inner
  const layoutKey = [
    'slice-v13',
    kind,
    layout.paperFormat,
    layout.pageOrientation,
    layout.marginMm,
    layout.dpi,
    innerWidthPx,
    innerHeightPx,
  ].join('|')
  return `${layoutKey}|${contentSuffix}`
}
