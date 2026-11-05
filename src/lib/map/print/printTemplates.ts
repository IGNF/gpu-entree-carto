import {
  BASE_DPI,
  HIGH_DPI_VALUE,
  PAPER_FORMATS_MM,
  isPaperFormatAllowedAtHighDpi,
  type PaperFormatId,
} from '@/lib/map/print/paperFormats'
import {
  computePrintSupplementInnerPx,
  printSupplementCssVars,
  type PrintSupplementInnerPx,
} from '@/lib/map/print/printSupplementLayout'

export const PRINT_TEMPLATE_CUSTOM_ID = 'custom' as const

export type PrintTemplateId =
  | typeof PRINT_TEMPLATE_CUSTOM_ID
  | 'a4-apercu'
  | 'a4-impression'
  | 'a4-paysage-apercu'
  | 'a3-apercu'

export type PrintTemplateLayout = {
  id: Exclude<PrintTemplateId, typeof PRINT_TEMPLATE_CUSTOM_ID>
  label: string
  paperFormat: PaperFormatId
  pageOrientation: 'portrait' | 'landscape'
  marginMm: number
  dpi: number
  exportFormat: 'PDF' | 'PNG' | 'JPEG'
}

/** Gabarits courants (aperçu 96 DPI + impression A4 300 DPI). */
export const PRINT_TEMPLATE_LAYOUTS: PrintTemplateLayout[] = [
  {
    id: 'a4-apercu',
    label: 'A4 — Aperçu rapide (96 DPI, PNG)',
    paperFormat: 'A4',
    pageOrientation: 'portrait',
    marginMm: 10,
    dpi: BASE_DPI,
    exportFormat: 'PNG',
  },
  {
    id: 'a4-impression',
    label: 'A4 — Impression (300 DPI, PDF)',
    paperFormat: 'A4',
    pageOrientation: 'portrait',
    marginMm: 10,
    dpi: HIGH_DPI_VALUE,
    exportFormat: 'PDF',
  },
  {
    id: 'a4-paysage-apercu',
    label: 'A4 paysage — Aperçu rapide (96 DPI)',
    paperFormat: 'A4',
    pageOrientation: 'landscape',
    marginMm: 10,
    dpi: BASE_DPI,
    exportFormat: 'PNG',
  },
  {
    id: 'a3-apercu',
    label: 'A3 — Aperçu rapide (96 DPI)',
    paperFormat: 'A3',
    pageOrientation: 'portrait',
    marginMm: 10,
    dpi: BASE_DPI,
    exportFormat: 'PNG',
  },
]

export type PrintFormLayoutSnapshot = {
  paperFormat: PaperFormatId
  pageOrientation: 'portrait' | 'landscape'
  margin: number
  dpi: number
  format: 'PDF' | 'PNG' | 'JPEG'
}

export type PrintTemplateMeasureContext = {
  paperFormat: PaperFormatId
  pageOrientation: 'portrait' | 'landscape'
  marginMm: number
  dpi: number
  paperWidthMm: number
  paperHeightMm: number
  inner: PrintSupplementInnerPx
  cssVars: Record<string, string>
}

export function paperSizeMmForLayout(
  paperFormat: PaperFormatId,
  pageOrientation: 'portrait' | 'landscape',
): { width: number; height: number } {
  const fmt = PAPER_FORMATS_MM[paperFormat]
  if (pageOrientation === 'landscape') {
    return { width: fmt.height, height: fmt.width }
  }
  return fmt
}

export function measureContextForTemplate(
  template: PrintTemplateLayout,
): PrintTemplateMeasureContext {
  return measureContextForFormLayout({
    paperFormat: template.paperFormat,
    pageOrientation: template.pageOrientation,
    margin: template.marginMm,
    dpi: template.dpi,
  })
}

export function measureContextForFormLayout(
  form: Pick<PrintFormLayoutSnapshot, 'paperFormat' | 'pageOrientation' | 'margin' | 'dpi'>,
): PrintTemplateMeasureContext {
  const paper = paperSizeMmForLayout(form.paperFormat, form.pageOrientation)
  const inner = computePrintSupplementInnerPx(paper.width, paper.height, form.margin, form.dpi)
  return {
    paperFormat: form.paperFormat,
    pageOrientation: form.pageOrientation,
    marginMm: form.margin,
    dpi: form.dpi,
    paperWidthMm: paper.width,
    paperHeightMm: paper.height,
    inner,
    cssVars: printSupplementCssVars(inner.innerWidthPx, form.dpi),
  }
}

export function isPrintTemplateAvailable(template: PrintTemplateLayout): boolean {
  if (template.dpi === HIGH_DPI_VALUE && !isPaperFormatAllowedAtHighDpi(template.paperFormat)) {
    return false
  }
  return true
}

export function templateMatchesFormState(
  template: PrintTemplateLayout,
  form: PrintFormLayoutSnapshot,
): boolean {
  return (
    template.paperFormat === form.paperFormat &&
    template.pageOrientation === form.pageOrientation &&
    template.marginMm === form.margin &&
    template.dpi === form.dpi &&
    template.exportFormat === form.format
  )
}

export function findMatchingPrintTemplate(
  form: PrintFormLayoutSnapshot,
): PrintTemplateLayout | undefined {
  return PRINT_TEMPLATE_LAYOUTS.find(
    (template) => isPrintTemplateAvailable(template) && templateMatchesFormState(template, form),
  )
}

export function applyPrintTemplateToForm(
  template: PrintTemplateLayout,
  form: PrintFormLayoutSnapshot,
): void {
  form.paperFormat = template.paperFormat
  form.pageOrientation = template.pageOrientation
  form.margin = template.marginMm
  form.dpi = template.dpi
  form.format = template.exportFormat
}
