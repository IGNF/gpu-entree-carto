import type { PrintPreviewPageKind } from '@/lib/map/print/printPageTypes'
import type { PrintTemplateMeasureContext } from '@/lib/map/print/printTemplates'

export type SupplementContentFingerprints = {
  territoryTabCount: number
  territoryPanelZoom: number
  parcelInfosLength: number
  parcelDocumentsLength: number
  legendLayerIds: string
  legendItemCount: number
  legendPreviewZoom: number
}

export function supplementContentSuffixForKind(
  kind: PrintPreviewPageKind,
  fingerprints: SupplementContentFingerprints,
): string {
  if (kind === 'ficheTerritory') {
    return `t:${fingerprints.territoryTabCount}|z:${fingerprints.territoryPanelZoom}`
  }
  if (kind === 'ficheParcel') {
    return `p:${fingerprints.parcelInfosLength}:${fingerprints.parcelDocumentsLength}`
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
    'slice-v8',
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
