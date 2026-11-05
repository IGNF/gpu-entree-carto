export type PrintPreviewPageKind = 'map' | 'ficheTerritory' | 'ficheParcel' | 'legends'

export type PrintPreviewPage = {
  id: string
  kind: PrintPreviewPageKind
  /** Tranche verticale (0-based) lorsque le contenu dépasse une feuille. */
  sliceIndex: number
  sliceCount: number
  label: string
}

export const PRINT_PAGE_LABELS: Record<PrintPreviewPageKind, string> = {
  map: 'Carte',
  ficheTerritory: 'Fiche territoire',
  ficheParcel: 'Fiche parcelle',
  legends: 'Légendes',
}

/** Nombre de tranches utiles (ignore une dernière page quasi vide). */
export function countSupplementSlices(contentHeightPx: number, pageHeightPx: number): number {
  if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) return 1
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return 1
  if (contentHeightPx <= pageHeightPx + 2) return 1

  let count = Math.ceil(contentHeightPx / pageHeightPx)
  const minLastSlicePx = pageHeightPx * 0.04
  while (count > 1) {
    const lastSliceHeight = contentHeightPx - (count - 1) * pageHeightPx
    if (lastSliceHeight >= minLastSlicePx) break
    count -= 1
  }
  return Math.max(1, count)
}

export function buildPrintPreviewPages(options: {
  includeTerritoryFiche: boolean
  includeParcelFiche: boolean
  includeLegends: boolean
  canTerritory: boolean
  canParcel: boolean
  canLegends: boolean
  sliceCounts: Partial<Record<PrintPreviewPageKind, number>>
}): PrintPreviewPage[] {
  const pages: PrintPreviewPage[] = [
    {
      id: 'map-0',
      kind: 'map',
      sliceIndex: 0,
      sliceCount: 1,
      label: PRINT_PAGE_LABELS.map,
    },
  ]

  function appendSection(kind: PrintPreviewPageKind, include: boolean, can: boolean): void {
    if (!include || !can) return
    const sliceCount = Math.max(1, options.sliceCounts[kind] ?? 1)
    const baseLabel = PRINT_PAGE_LABELS[kind]
    for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex += 1) {
      pages.push({
        id: `${kind}-${sliceIndex}`,
        kind,
        sliceIndex,
        sliceCount,
        label: sliceCount > 1 ? `${baseLabel} (${sliceIndex + 1}/${sliceCount})` : baseLabel,
      })
    }
  }

  appendSection('ficheTerritory', options.includeTerritoryFiche, options.canTerritory)
  appendSection('ficheParcel', options.includeParcelFiche, options.canParcel)
  appendSection('legends', options.includeLegends, options.canLegends)

  return pages
}
