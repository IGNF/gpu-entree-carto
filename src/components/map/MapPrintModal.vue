<script setup lang="ts">
/**
 * Modale d’impression — alignée sur cartes.gouv.fr-entree-carto (`PrintModal.vue`).
 * Prévisualisation : clone OL (`src/lib/map/print/`) à la place de MapView / PrintLayers.
 */
import {
  computed,
  inject,
  nextTick,
  onUnmounted,
  reactive,
  ref,
  shallowRef,
  watch,
  type ShallowRef,
} from 'vue'
import { useElementSize, watchDebounced } from '@vueuse/core'
import Map from 'ol/Map'
import View from 'ol/View'
import { Attribution } from 'ol/control'
import ScaleLine from 'ol/control/ScaleLine'
import { useMapLegendZoom } from '@/composables/useMapLegendZoom'
import { configureDisplayOnlyOlControls } from '@/composables/useOlMap'
import {
  DsfrButton,
  DsfrCheckbox,
  DsfrInput,
  DsfrModal,
  DsfrSegmentedSet,
  DsfrSelect,
} from '@gouvminint/vue-dsfr'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import {
  BASE_DPI,
  COEFF_PX2MM,
  HIGH_DPI_VALUE,
  PAPER_FORMATS_MM,
  convertMmToPx,
  isPaperFormatAllowedAtHighDpi,
  type PaperFormatId,
} from '@/lib/map/print/paperFormats'
import { rebuildPrintPreviewMap } from '@/lib/map/print/cloneMapLayers'
import { renderOffscreenPrintMapCanvas } from '@/lib/map/print/offscreenPrintMapExport'
import { WeightedExportProgress } from '@/lib/map/print/printExportProgress'
import { injectDpiInPng } from '@/lib/map/print/pngDpi'
import { copyViewState } from '@/lib/map/print/syncPrintMapView'
import { waitForMapRender } from '@/lib/map/print/waitForMapRender'
import { captureScaleLineSnapshot, computeScaleCoeff, drawScale } from '@/lib/map/print/printScale'
import {
  computePrintMapTitleLayout,
  drawPrintMapTitleOnCanvas,
  PRINT_MAP_TITLE_MAX_CHARS,
  PRINT_MAP_MIN_MAP_HEIGHT_RATIO,
} from '@/lib/map/print/printMapTitle'
import {
  buildPrintMapRenderCacheKey,
  buildVisibleLayerFingerprint,
  clearPrintMapRenderCache,
} from '@/lib/map/print/printMapRenderCache'
import { prewarmPrintMapRenderCache } from '@/lib/map/print/printMapPrewarm'
import {
  encodePrintJpeg,
  encodePrintPdf,
  encodePrintPngWithDpi,
  terminatePrintExportWorker,
} from '@/lib/map/print/printExportEncode'
import {
  buildPrintPreviewPages,
  PRINT_PAGE_LABELS,
  type PrintPreviewPageKind,
} from '@/lib/map/print/printPageTypes'
import { rasterizePrintSupplementPreviewFrame } from '@/lib/map/print/rasterizePrintSupplementPage'
import {
  computePrintSupplementInnerPx,
  ficheFootnotesVisibleForSlice,
  PRINT_SUPPLEMENT_BLOCK_GAP_MM,
  hideSupplementElementsForSlice,
  measureSupplementSlicePlan,
  measureSupplementSlicePlanFromPage,
  printSupplementCssVars,
  resetSupplementElementVisibility,
  resolveSupplementSliceEndPx,
  resolveSupplementSliceStartPx,
  supplementSliceLayoutHeightPx,
  type SupplementSlicePlan,
  waitForPrintSupplementImages,
  waitForSupplementMeasureHeightStable,
  waitForSupplementPageHeightStable,
} from '@/lib/map/print/printSupplementLayout'
import {
  buildParcelDocumentsPrintHtml,
  buildParcelInfosPrintHtml,
  isParcelFichePrintReady,
  isTerritoryFichePrintReady,
  normalizeFicheSelectionForPrint,
  parcelPrintTitle,
  territoryPrintTitle,
} from '@/lib/map/print/printFicheSnapshot'
import { getCachedFicheSelectionAtMarker } from '@/lib/fiche/ficheInfoService'
import { dedupeLegendLayersForPanel } from '@/lib/layerConfig/gpuLegendItems'
import { mapPrintPanelsRef } from '@/map/mapPrintPanelsContext'
import type { MapPrintModalOpenOptions } from '@/map/mapPrintModalContext'
import { sanitizePrintPreviewAttributions } from '@/lib/map/print/sanitizePrintAttributions'
import { drawAttributionOnMapExport } from '@/lib/map/print/drawPrintAttribution'
import MapPrintFicheTerritoryPage from '@/components/map/print/MapPrintFicheTerritoryPage.vue'
import MapPrintFicheParcelPage from '@/components/map/print/MapPrintFicheParcelPage.vue'
import MapPrintLegendsPage from '@/components/map/print/MapPrintLegendsPage.vue'
import PrintExportProgressOverlay from '@/components/map/print/PrintExportProgressOverlay.vue'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import {
  resolvePrintFicheSelections,
  type PrintFicheSelections,
} from '@/lib/map/print/resolvePrintFicheSelections'
import {
  annexKindsToInvalidateForContentChange,
  buildAnnexContentMeasureSnapshot,
  type AnnexContentMeasureSnapshot,
} from '@/lib/map/print/printAnnexContentMeasure'
import {
  buildSupplementSlicePlanCacheKey,
  supplementContentSuffixForKind,
  type SupplementContentFingerprints,
} from '@/lib/map/print/printSlicePlanCache'
import { parcelLegendScaleBand } from '@/lib/fiche/parcelLegendImage'
import {
  PRINT_TEMPLATE_CUSTOM_ID,
  PRINT_TEMPLATE_LAYOUTS,
  applyPrintTemplateToForm,
  findMatchingPrintTemplate,
  isPrintTemplateAvailable,
  measureContextForFormLayout,
  measureContextForTemplate,
  type PrintTemplateId,
  type PrintTemplateMeasureContext,
} from '@/lib/map/print/printTemplates'

const title = 'Imprimer une carte'
const size = 'xl'

function logPrintPreview(step: string, detail?: unknown): void {
  if (!import.meta.env.DEV) return
  if (detail !== undefined) {
    console.log(`[MapPrintModal preview] ${step}`, detail)
  } else {
    console.log(`[MapPrintModal preview] ${step}`)
  }
}

const printModalOpened = ref(false)
const isExportInProgress = ref(false)
const exportProgressPercent = ref(0)
const exportProgressDetail = ref('')
/** Aperçu feuille masqué tant que carte + pagination annexes ne sont pas prêts. */
const isPreviewLayoutPending = ref(false)
/** Ignore un `@close` DSFR dans la foulée du clic d’ouverture (carte / focus). */
let dismissGuardUntil = 0

function syncNativePrintDialog(): void {
  if (!printModalOpened.value) return
  const dialog = printPage.value?.closest('dialog')
  if (!dialog || dialog.open) return
  try {
    dialog.showModal()
  } catch {
    /* déjà ouvert ou indisponible */
  }
  dialog.classList.add('fr-modal--opened')
  document.body.classList.add('modal-open')
}

function applyPrintOpenOptions(options?: MapPrintModalOpenOptions): void {
  if (!options) return
  if (options.hasTerritoryFiche !== undefined) {
    printFormState.hasTerritoryFiche = options.hasTerritoryFiche
  }
  if (options.hasParcelFiche !== undefined) printFormState.hasParcelFiche = options.hasParcelFiche
  if (options.hasLegends !== undefined) printFormState.hasLegends = options.hasLegends
  if (options.hasAllLegends !== undefined) printFormState.hasAllLegends = options.hasAllLegends
  if (!printFormState.hasLegends) printFormState.hasAllLegends = false
}

function onModalPrintOpen(options?: MapPrintModalOpenOptions): void {
  applyPrintOpenOptions(options)
  dismissGuardUntil = Date.now() + 500
  printModalOpened.value = true
  void nextTick(() => {
    syncNativePrintDialog()
    requestAnimationFrame(() => syncNativePrintDialog())
  })
}

function onModalPrintClose(): void {
  if (Date.now() < dismissGuardUntil) {
    void nextTick(() => {
      printModalOpened.value = true
    })
    return
  }
  isExportInProgress.value = false
  isPreviewLayoutPending.value = false
  printMapPrewarmGeneration += 1
  clearPrintMapRenderCache()
  terminatePrintExportWorker()
  printTemplatePrewarmGeneration += 1
  measureLayoutOverride.value = null
  previewColumnZoom.value = 1
  printModalOpened.value = false
  document.body.classList.remove('modal-open')
  sourceMapRef.value?.renderSync()
}

defineExpose({
  open: onModalPrintOpen,
  close: onModalPrintClose,
})

const sourceMapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const printPanels = mapPrintPanelsRef

const previewMapEl = ref<HTMLElement | null>(null)
const supplementPreviewEl = ref<HTMLElement | null>(null)
const supplementContentRef = ref<HTMLElement | null>(null)
/** Réfs DOM aperçu annexes (lecture template). */
const supplementPreviewDomRefs = [supplementPreviewEl, supplementContentRef] as const
void supplementPreviewDomRefs
const supplementMeasureInnerRef = ref<HTMLElement | null>(null)
const measureKind = ref<PrintPreviewPageKind | null>(null)
const supplementSliceCounts = ref<Partial<Record<PrintPreviewPageKind, number>>>({})
const supplementSliceStarts = ref<Partial<Record<PrintPreviewPageKind, number[]>>>({})
/** Décalage vertical aperçu (coupures repères, pas grille uniforme). */
const supplementPreviewSliceStartPx = ref(0)
/** Cache des plans de pagination par annexe (réutilisé en cochant / décochant). */
const supplementSlicePlanByKey = new globalThis.Map<string, SupplementSlicePlan>()
let printTemplatePrewarmGeneration = 0
const measureLayoutOverride = ref<{
  innerWidthPx: number
  innerHeightPx: number
  cssVars: Record<string, string>
} | null>(null)
const selectedPrintTemplateId = ref<PrintTemplateId>('a4-apercu')
let applyingPrintTemplate = false
const previewPageIndex = ref(0)
const printPage = ref<HTMLElement | null>(null)
const printForm = ref<HTMLElement | null>(null)
const previewPaginationEl = ref<HTMLElement | null>(null)
const previewZoomHostEl = ref<HTMLElement | null>(null)

const PREVIEW_COLUMN_ZOOM_MIN = 0.6
const PREVIEW_COLUMN_ZOOM_MAX = 2.5
const PREVIEW_COLUMN_ZOOM_STEP = 0.08
const previewColumnZoom = ref(1)

const previewMap = shallowRef<Map | null>(null)
const { legendZoom: printPreviewLegendZoom } = useMapLegendZoom(previewMap)

type PrintFormState = {
  hasScale: boolean
  hasTitle: boolean
  hasTerritoryFiche: boolean
  hasParcelFiche: boolean
  hasLegends: boolean
  hasAllLegends: boolean
  printTitle: string
  pageOrientation: 'portrait' | 'landscape'
  margin: number
  paperFormat: PaperFormatId
  dpi: number
  format: 'PDF' | 'PNG' | 'JPEG'
}

const printFormState = reactive<PrintFormState>({
  hasScale: true,
  hasTitle: true,
  hasTerritoryFiche: false,
  hasParcelFiche: false,
  hasLegends: false,
  hasAllLegends: false,
  printTitle: 'Ma carte',
  pageOrientation: 'portrait',
  margin: 10,
  paperFormat: 'A4',
  dpi: BASE_DPI,
  format: 'PNG',
})

const defaultPrintTemplate = PRINT_TEMPLATE_LAYOUTS.find((t) => t.id === 'a4-apercu')
if (defaultPrintTemplate) {
  applyPrintTemplateToForm(defaultPrintTemplate, printFormState)
}

const paperDimension = computed(() => {
  const fmt = PAPER_FORMATS_MM[printFormState.paperFormat]
  if (printFormState.pageOrientation === 'landscape') {
    return { width: fmt.height, height: fmt.width }
  }
  return fmt
})

const panelSelection = computed(() => printPanels.value?.selection.value ?? null)
const panelLegendLayers = computed(() => printPanels.value?.legendLayers.value ?? [])
const panelLegendLayersAll = computed(() => printPanels.value?.legendLayersAll.value ?? [])
const printLegendLayerSource = computed(() =>
  printFormState.hasLegends && printFormState.hasAllLegends
    ? panelLegendLayersAll.value
    : panelLegendLayers.value,
)
const panelMapZoom = computed(() => printPanels.value?.mapZoom.value ?? 6)

const printFicheSelections = ref<PrintFicheSelections | null>(null)
let printFicheLoadGeneration = 0

function mergeFicheSelectionForPrint(
  mode: MapModeId,
  resolved: FicheInfoSelection | null | undefined,
  panel: FicheInfoSelection | null,
  isReady: (selection: FicheInfoSelection | null) => boolean,
): FicheInfoSelection | null {
  const candidates: (FicheInfoSelection | null | undefined)[] = [
    resolved,
    getCachedFicheSelectionAtMarker(mode),
    panel?.mapMode === mode ? panel : null,
    panel,
  ]
  for (const candidate of candidates) {
    const normalized = normalizeFicheSelectionForPrint(candidate ?? null, mode)
    if (normalized && isReady(normalized)) return normalized
  }
  return null
}

function syncPrintFicheSelectionsFromCache(): void {
  printFicheSelections.value = {
    territory: getCachedFicheSelectionAtMarker(MAP_MODE_TERRITORY),
    parcel: getCachedFicheSelectionAtMarker(MAP_MODE_PARCEL),
  }
}

const territorySelectionForPrint = computed(() =>
  mergeFicheSelectionForPrint(
    MAP_MODE_TERRITORY,
    printFicheSelections.value?.territory,
    panelSelection.value,
    isTerritoryFichePrintReady,
  ),
)
const parcelSelectionForPrint = computed(() =>
  mergeFicheSelectionForPrint(
    MAP_MODE_PARCEL,
    printFicheSelections.value?.parcel,
    panelSelection.value,
    isParcelFichePrintReady,
  ),
)

const parcelCadastreReferences = computed(
  () => parcelSelectionForPrint.value?.cadastreReferences ?? null,
)

const canPrintTerritoryFiche = computed(() =>
  isTerritoryFichePrintReady(territorySelectionForPrint.value),
)
const canPrintParcelFiche = computed(() => isParcelFichePrintReady(parcelSelectionForPrint.value))
const canPrintLegends = computed(() => {
  const zoom = printPreviewLegendZoom.value
  const filtered = dedupeLegendLayersForPanel(panelLegendLayers.value)
  const all = dedupeLegendLayersForPanel(panelLegendLayersAll.value)
  const hasFiltered = filtered.some(
    (layer) => (layer.legend?.length ?? 0) > 0 && catalogEntryInZoomRangeForPrint(layer.id, zoom),
  )
  const hasAll = all.some((layer) => (layer.legend?.length ?? 0) > 0)
  return hasFiltered || hasAll
})

watch(
  () => printFormState.hasLegends,
  (enabled) => {
    if (!enabled) printFormState.hasAllLegends = false
  },
)

const territoryDocumentTabs = computed(() => territorySelectionForPrint.value?.documentTabs ?? [])

const parcelInfosHtml = computed(() =>
  buildParcelInfosPrintHtml(parcelSelectionForPrint.value, printPreviewLegendZoom.value),
)
const parcelDocumentsHtml = computed(() =>
  buildParcelDocumentsPrintHtml(parcelSelectionForPrint.value),
)

async function refreshPrintFicheSelections(): Promise<void> {
  const generation = ++printFicheLoadGeneration
  logPrintPreview('fiches: chargement…', { generation })
  const result = await resolvePrintFicheSelections(panelMapZoom.value, {
    territory: true,
    parcel: true,
  })
  if (generation !== printFicheLoadGeneration) {
    logPrintPreview('fiches: ignoré (génération obsolète)', {
      generation,
      current: printFicheLoadGeneration,
    })
    return
  }
  printFicheSelections.value = result
  lastAnnexContentSnapshot = annexContentSnapshot.value
  logPrintPreview('fiches: chargées, mesure annexes…')
  await remeasureSupplementPageCounts()
}

const previewPages = computed(() =>
  buildPrintPreviewPages({
    includeTerritoryFiche: printFormState.hasTerritoryFiche,
    includeParcelFiche: printFormState.hasParcelFiche,
    includeLegends: printFormState.hasLegends,
    canTerritory: canPrintTerritoryFiche.value,
    canParcel: canPrintParcelFiche.value,
    canLegends: canPrintLegends.value,
    sliceCounts: supplementSliceCounts.value,
  }),
)

const currentPreviewPage = computed(
  () => previewPages.value[previewPageIndex.value] ?? previewPages.value[0],
)

watch(previewPages, (pages) => {
  if (previewPageIndex.value >= pages.length) {
    previewPageIndex.value = Math.max(0, pages.length - 1)
  }
})

watch(
  () =>
    [
      printFormState.hasTerritoryFiche,
      printFormState.hasParcelFiche,
      printFormState.hasLegends,
      printFormState.hasAllLegends,
    ] as const,
  () => {
    previewPageIndex.value = 0
  },
)

/** Contenu annexes (indépendant du gabarit papier) — voir `printAnnexContentMeasure.ts`. */
const annexContentSnapshot = computed(() =>
  buildAnnexContentMeasureSnapshot({
    territoryTabCount: territoryDocumentTabs.value.length,
    parcelInfosLength: parcelInfosHtml.value.length,
    parcelDocumentsLength: parcelDocumentsHtml.value.length,
    parcelLegendScale: parcelLegendScaleBand(printPreviewLegendZoom.value),
    legendsIncludeAll: printFormState.hasAllLegends,
    legendPreviewZoom: printPreviewLegendZoom.value,
    legendLayerIds: printLegendLayerSource.value.map((layer) => layer.id).join(','),
    legendItemCount: printLegendLayerSource.value.reduce(
      (count, layer) => count + (layer.legend?.length ?? 0),
      0,
    ),
  }),
)

const supplementContentFingerprints = computed((): SupplementContentFingerprints => ({
  territoryTabCount: annexContentSnapshot.value.territoryTabCount,
  parcelInfosLength: annexContentSnapshot.value.parcelInfosLength,
  parcelDocumentsLength: annexContentSnapshot.value.parcelDocumentsLength,
  parcelLegendScale: annexContentSnapshot.value.parcelLegendScale,
  legendsIncludeAll: annexContentSnapshot.value.legendsIncludeAll,
  legendPreviewZoom: annexContentSnapshot.value.legendPreviewZoom ?? 0,
  legendLayerIds: annexContentSnapshot.value.legendLayerIds,
  legendItemCount: annexContentSnapshot.value.legendItemCount,
}))

let lastAnnexContentSnapshot: AnnexContentMeasureSnapshot | null = null

function currentMeasureLayoutContext(): PrintTemplateMeasureContext {
  return measureContextForFormLayout(printFormState)
}

function supplementSlicePlanCacheKey(kind: PrintPreviewPageKind): string {
  return buildSupplementSlicePlanCacheKey(
    kind,
    currentMeasureLayoutContext(),
    supplementContentSuffixForKind(kind, supplementContentFingerprints.value),
  )
}

function supplementSlicePlanCacheKeyForLayout(
  kind: PrintPreviewPageKind,
  layout: PrintTemplateMeasureContext,
): string {
  return buildSupplementSlicePlanCacheKey(
    kind,
    layout,
    supplementContentSuffixForKind(kind, supplementContentFingerprints.value),
  )
}

const printTemplateSelectOptions = computed(() => {
  const presets = PRINT_TEMPLATE_LAYOUTS.filter(isPrintTemplateAvailable).map((template) => ({
    value: template.id,
    text: template.label,
  }))
  return [...presets, { value: PRINT_TEMPLATE_CUSTOM_ID, text: 'Personnalisé' }]
})

function syncSelectedPrintTemplateFromForm(): void {
  if (applyingPrintTemplate) return
  const match = findMatchingPrintTemplate(printFormState)
  selectedPrintTemplateId.value = match?.id ?? PRINT_TEMPLATE_CUSTOM_ID
}

watch(selectedPrintTemplateId, (templateId) => {
  if (templateId === PRINT_TEMPLATE_CUSTOM_ID) return
  const template = PRINT_TEMPLATE_LAYOUTS.find((entry) => entry.id === templateId)
  if (!template || !isPrintTemplateAvailable(template)) return
  applyingPrintTemplate = true
  applyPrintTemplateToForm(template, printFormState)
  applyingPrintTemplate = false
})

watch(
  () =>
    [
      printFormState.paperFormat,
      printFormState.pageOrientation,
      printFormState.margin,
      printFormState.dpi,
      printFormState.format,
    ] as const,
  () => syncSelectedPrintTemplateFromForm(),
  { immediate: true },
)

function invalidateLegendsSlicePlanCache(): void {
  for (const key of supplementSlicePlanByKey.keys()) {
    if (key.includes('|legends|')) supplementSlicePlanByKey.delete(key)
  }
}

function invalidateTerritorySlicePlanCache(): void {
  for (const key of supplementSlicePlanByKey.keys()) {
    if (key.includes('|ficheTerritory|')) supplementSlicePlanByKey.delete(key)
  }
}

function invalidateParcelSlicePlanCache(): void {
  for (const key of supplementSlicePlanByKey.keys()) {
    if (key.includes('|ficheParcel|')) supplementSlicePlanByKey.delete(key)
  }
}

function invalidateAnnexSlicePlanCacheForKinds(kinds: PrintPreviewPageKind[]): void {
  for (const kind of kinds) {
    if (kind === 'ficheTerritory') invalidateTerritorySlicePlanCache()
    else if (kind === 'ficheParcel') invalidateParcelSlicePlanCache()
    else if (kind === 'legends') invalidateLegendsSlicePlanCache()
  }
}

function goPreviewPage(delta: number): void {
  const count = previewPages.value.length
  if (count <= 1) return
  previewPageIndex.value = (previewPageIndex.value + delta + count) % count
}

async function measureSlicePlanForKindInDom(
  kind: PrintPreviewPageKind,
  pageHeightPx: number,
  options: { imageTimeoutMs?: number } = {},
): Promise<SupplementSlicePlan> {
  measureKind.value = kind
  await nextTick()
  await nextTick()
  const measureRoot = supplementMeasureInnerRef.value
  if (measureRoot) {
    const imgCount = measureRoot.querySelectorAll('img').length
    if (imgCount > 0) {
      await waitForPrintSupplementImages(measureRoot, {
        timeoutMs: options.imageTimeoutMs ?? 4_000,
      })
    }
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  measureRoot?.getBoundingClientRect()
  if (measureRoot) {
    await waitForSupplementMeasureHeightStable(measureRoot, {
      timeoutMs: options.imageTimeoutMs ?? 4_000,
    })
  }
  return measureRoot
    ? measureSupplementSlicePlan(measureRoot, pageHeightPx)
    : { sliceCount: 1, sliceStarts: [0] }
}

function sliceStartsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function applySupplementSlicePlanFromPreview(
  kind: PrintPreviewPageKind,
  plan: SupplementSlicePlan,
): void {
  const current = supplementSliceCounts.value[kind] ?? 1
  const starts = supplementSliceStarts.value[kind] ?? [0]
  if (plan.sliceCount === current && sliceStartsEqual(starts, plan.sliceStarts)) return
  if ((kind === 'ficheParcel' || kind === 'ficheTerritory') && plan.sliceCount < current) {
    return
  }
  supplementSlicePlanByKey.set(supplementSlicePlanCacheKey(kind), plan)
  supplementSliceCounts.value = { ...supplementSliceCounts.value, [kind]: plan.sliceCount }
  supplementSliceStarts.value = { ...supplementSliceStarts.value, [kind]: [...plan.sliceStarts] }
  logPrintPreview(`mesure aperçu visible: « ${kind} » révisé`, plan)
}

async function remeasureSupplementFromVisiblePreview(): Promise<void> {
  if (!printModalOpened.value || isPreviewLayoutPending.value || isExportInProgress.value) return
  const pageMeta = currentPreviewPage.value
  if (!pageMeta || pageMeta.kind === 'map') return
  /** Fiches : mesure hors écran uniquement (aperçu zoomé + tranches fausse la hauteur des encarts). */
  if (pageMeta.kind === 'ficheParcel' || pageMeta.kind === 'ficheTerritory') return
  /** « Toutes les légendes » : contenu indépendant du zoom aperçu. */
  if (pageMeta.kind === 'legends' && printFormState.hasAllLegends) return

  const pageRoot = findSupplementPreviewPageRoot()
  const sliceHeightPx = supplementSliceLayoutHeight.value
  if (!pageRoot || sliceHeightPx < 8) return

  await waitForPrintSupplementImages(pageRoot, { timeoutMs: 6_000 })
  await waitForSupplementPageHeightStable(pageRoot, { timeoutMs: 4_000 })
  const plan = measureSupplementSlicePlanFromPage(pageRoot, sliceHeightPx)
  applySupplementSlicePlanFromPreview(pageMeta.kind, plan)
}

async function prewarmOtherPrintTemplateCaches(): Promise<void> {
  const generation = ++printTemplatePrewarmGeneration
  if (!printModalOpened.value) return

  const kinds: PrintPreviewPageKind[] = []
  if (canPrintTerritoryFiche.value) kinds.push('ficheTerritory')
  if (canPrintParcelFiche.value) kinds.push('ficheParcel')
  if (canPrintLegends.value) kinds.push('legends')
  if (!kinds.length) return

  const current = currentMeasureLayoutContext()
  const templates = PRINT_TEMPLATE_LAYOUTS.filter(isPrintTemplateAvailable)

  for (const template of templates) {
    if (generation !== printTemplatePrewarmGeneration || !printModalOpened.value) return
    const layout = measureContextForTemplate(template)
    const isCurrentLayout =
      layout.paperFormat === current.paperFormat &&
      layout.pageOrientation === current.pageOrientation &&
      layout.marginMm === current.marginMm &&
      layout.dpi === current.dpi
    if (isCurrentLayout) continue

    for (const kind of kinds) {
      if (generation !== printTemplatePrewarmGeneration || !printModalOpened.value) return
      const cacheKey = supplementSlicePlanCacheKeyForLayout(kind, layout)
      if (supplementSlicePlanByKey.has(cacheKey)) continue

      measureLayoutOverride.value = {
        innerWidthPx: layout.inner.innerWidthPx,
        innerHeightPx: layout.inner.innerHeightPx,
        cssVars: layout.cssVars,
      }
      logPrintPreview('préchauffage gabarit', { template: template.id, kind })
      try {
        const plan = await measureSlicePlanForKindInDom(
          kind,
          supplementSliceLayoutHeightPx(layout.inner.innerHeightPx, layout.dpi),
          { imageTimeoutMs: 2_500 },
        )
        supplementSlicePlanByKey.set(cacheKey, plan)
      } catch (err) {
        logPrintPreview('préchauffage gabarit: erreur', err)
      }
    }
  }

  measureLayoutOverride.value = null
  measureKind.value = null
  logPrintPreview('préchauffage gabarits terminé')
}

function schedulePrintTemplatePrewarm(): void {
  const run = (): void => {
    void prewarmOtherPrintTemplateCaches()
  }
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 10_000 })
  } else {
    window.setTimeout(run, 400)
  }
}

function schedulePrintMapPrewarm(): void {
  const run = (): void => {
    void runPrintMapPrewarm()
  }
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 20_000 })
  } else {
    window.setTimeout(run, 800)
  }
}

async function runPrintMapPrewarm(): Promise<void> {
  const generation = ++printMapPrewarmGeneration
  if (!printModalOpened.value || isExportInProgress.value || isPreviewLayoutPending.value) return
  const map = previewMap.value
  if (!map || currentPreviewPage.value?.kind !== 'map') return
  const mapSize = map.getSize()
  if (!mapSize || mapSize[0] < 16 || mapSize[1] < 16) return

  const dpiValue = printFormState.dpi
  const paperWidthPx = convertMmToPx(paperDimension.value.width, dpiValue)
  const paperHeightPx = convertMmToPx(paperDimension.value.height, dpiValue)
  const marginPx = convertMmToPx(printFormState.margin, dpiValue)
  const printableHeightPx = Math.max(0, paperHeightPx - marginPx * 2)
  const titleHeightPx = printFormState.hasTitle
    ? Math.round(
        (printMapTitleLayout.value.titleHeightMm / printableAreaMm.value.height) *
          printableHeightPx,
      )
    : 0
  const mapWidthPx = Math.max(0, paperWidthPx - marginPx * 2)
  const mapHeightPx = Math.max(0, printableHeightPx - titleHeightPx)
  if (mapHeightPx < 16 || mapWidthPx < 16) return

  const extent = map.getView().calculateExtent(mapSize)
  try {
    await prewarmPrintMapRenderCache({
      previewMap: map,
      dpi: dpiValue,
      mapWidthPx,
      mapHeightPx,
      extent,
    })
  } catch (err) {
    logPrintPreview('préchauffage carte: ignoré', err)
  }
  if (generation !== printMapPrewarmGeneration) return
  logPrintPreview('préchauffage carte terminé')
}

type RemeasureSupplementOptions = {
  /** Masque l’aperçu (« Préparation de l’aperçu… »). Désactivé pendant l’export. */
  blockPreview?: boolean
  onStage?: (label: string) => void
}

async function remeasureSupplementPageCounts(
  options: RemeasureSupplementOptions = {},
): Promise<void> {
  const blockPreview = options.blockPreview !== false
  if (isExportInProgress.value && blockPreview) {
    logPrintPreview('mesure: ignorée (export en cours)')
    return
  }
  if (!printModalOpened.value) {
    logPrintPreview('mesure: ignorée (modale fermée)')
    return
  }

  const { innerWidthPx, innerHeightPx } = supplementExportInner.value
  if (innerWidthPx < 8 || innerHeightPx < 8) {
    logPrintPreview('mesure: zone trop petite, report', { innerWidthPx, innerHeightPx })
    return
  }

  const kinds: PrintPreviewPageKind[] = []
  if (canPrintTerritoryFiche.value) kinds.push('ficheTerritory')
  if (canPrintParcelFiche.value) kinds.push('ficheParcel')
  if (canPrintLegends.value) kinds.push('legends')

  if (!kinds.length) {
    supplementSliceCounts.value = {}
    supplementSliceStarts.value = {}
    logPrintPreview('mesure: aucune annexe mesurable')
    return
  }

  const kindsToMeasure = kinds.filter(
    (kind) => !supplementSlicePlanByKey.has(supplementSlicePlanCacheKey(kind)),
  )
  if (kindsToMeasure.length > 0 && blockPreview) {
    isPreviewLayoutPending.value = true
  }
  options.onStage?.('Analyse de la pagination des annexes…')
  logPrintPreview('mesure: début', {
    kinds,
    cacheHits: kinds.length - kindsToMeasure.length,
    toMeasure: kindsToMeasure,
  })

  try {
    if (kindsToMeasure.length > 0 && typeof document !== 'undefined' && document.fonts) {
      logPrintPreview('mesure: attente polices…')
      await document.fonts.ready.catch(() => undefined)
      logPrintPreview('mesure: polices prêtes')
    }

    const nextCounts: Partial<Record<PrintPreviewPageKind, number>> = {}
    const nextStarts: Partial<Record<PrintPreviewPageKind, number[]>> = {}

    for (const kind of kinds) {
      const cacheKey = supplementSlicePlanCacheKey(kind)
      let plan = supplementSlicePlanByKey.get(cacheKey)
      if (plan) {
        logPrintPreview(`mesure: cache « ${kind} »`, plan)
      } else {
        logPrintPreview(`mesure: DOM « ${kind} »`)
        options.onStage?.(`Pagination « ${PRINT_PAGE_LABELS[kind]} »…`)
        measureLayoutOverride.value = null
        plan = await measureSlicePlanForKindInDom(kind, supplementSliceLayoutHeight.value, {
          imageTimeoutMs: 4_000,
        })
        supplementSlicePlanByKey.set(cacheKey, plan)
        logPrintPreview(`mesure: « ${kind} » calculé`, plan)
      }
      nextCounts[kind] = plan.sliceCount
      nextStarts[kind] = [...plan.sliceStarts]
    }

    measureKind.value = null
    supplementSliceCounts.value = nextCounts
    supplementSliceStarts.value = nextStarts
    logPrintPreview('mesure: terminée', { sliceCounts: { ...nextCounts } })
  } catch (err) {
    logPrintPreview('mesure: erreur', err)
    throw err
  } finally {
    if (printModalOpened.value) {
      isPreviewLayoutPending.value = false
      logPrintPreview('mesure: aperçu affiché (pending=false)')
      schedulePrintTemplatePrewarm()
      schedulePrintMapPrewarm()
    } else {
      logPrintPreview('mesure: fin sans réafficher (modale fermée)')
    }
  }
}

const catalogEntryInZoomRangeForPrint = (layerId: string, zoom: number): boolean =>
  printPanels.value?.catalogEntryInZoomRange(layerId, zoom) ?? true

const previewMapHostSize = reactive(
  useElementSize(previewMapEl, { width: 0, height: 0 }, { box: 'border-box' }),
)
const previewZoomHostSize = reactive(
  useElementSize(previewZoomHostEl, { width: 0, height: 0 }, { box: 'border-box' }),
)

const previewColumnScaleSlotStyle = computed(() => {
  const scale = previewColumnZoom.value
  const width = previewZoomHostSize.width
  const height = previewZoomHostSize.height
  if (width < 1 || height < 1) return undefined
  return {
    width: `${Math.ceil(width * scale)}px`,
    height: `${Math.ceil(height * scale)}px`,
  }
})

const previewColumnScaleInnerStyle = computed(() => ({
  transform: `scale(${previewColumnZoom.value})`,
  transformOrigin: 'top center',
}))

function isWheelOverPreviewMap(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.ec-map-print-preview-map'))
}

function onPreviewColumnWheel(event: WheelEvent): void {
  if (!printModalOpened.value || isPreviewLayoutPending.value) return
  if (isWheelOverPreviewMap(event.target)) return
  if (!event.ctrlKey) return
  event.preventDefault()
  const direction = event.deltaY > 0 ? -1 : 1
  const next = previewColumnZoom.value + direction * PREVIEW_COLUMN_ZOOM_STEP
  previewColumnZoom.value = Math.min(
    PREVIEW_COLUMN_ZOOM_MAX,
    Math.max(PREVIEW_COLUMN_ZOOM_MIN, next),
  )
}

watch(
  () => [previewMapHostSize.width, previewMapHostSize.height] as const,
  () => {
    if (!printModalOpened.value) return
    previewMap.value?.updateSize()
    previewMap.value?.renderSync()
    sanitizePrintPreviewAttributions(previewMapEl.value)
  },
)

const pageOrientationOptions = [
  { label: 'Portrait', value: 'portrait' },
  { label: 'Paysage', value: 'landscape' },
]

const paperFormatOptions = computed(() =>
  Object.entries(PAPER_FORMATS_MM).map(([format, dimension]) => {
    const id = format as PaperFormatId
    const disabled = printFormState.dpi === HIGH_DPI_VALUE && !isPaperFormatAllowedAtHighDpi(id)
    return {
      value: id,
      text: `${format} (${dimension.width} x ${dimension.height} mm)`,
      disabled,
    }
  }),
)

const dpiOptions = computed(() => [
  { value: BASE_DPI, text: '96 DPI (écran)' },
  {
    value: HIGH_DPI_VALUE,
    text: '300 DPI (impression)',
    disabled: !isPaperFormatAllowedAtHighDpi(printFormState.paperFormat),
  },
])

watch(
  () => [printFormState.dpi, printFormState.paperFormat] as const,
  ([dpiValue, paperFormat]) => {
    if (dpiValue === HIGH_DPI_VALUE && !isPaperFormatAllowedAtHighDpi(paperFormat)) {
      printFormState.paperFormat = 'A4'
    }
  },
  { immediate: true },
)

const printPageSize = reactive(
  useElementSize(printPage, { width: 0, height: 0 }, { box: 'border-box' }),
)
const printFormSize = reactive(
  useElementSize(printForm, { width: 0, height: 0 }, { box: 'border-box' }),
)
const previewPaginationSize = reactive(
  useElementSize(previewPaginationEl, { width: 0, height: 0 }, { box: 'border-box' }),
)

/** Marges autour du cadre feuille (ombre portée `box-shadow` du conteneur). */
const previewFrameMarginPx = {
  top: 6,
  bottom: 12,
  horizontal: 10,
} as const

/** Espace entre feuille et barre de pagination (`gap` CSS). */
const previewColumnGapPx = 8

/** Espace réservé sous l’aperçu feuille pour la barre de pagination. */
const previewPaginationReservePx = computed(() => {
  const measured = previewPaginationSize.height
  const barHeight = measured > 4 ? measured : 48
  return barHeight + previewColumnGapPx
})

/** Hauteur / largeur utiles pour dimensionner la feuille sans rogner le cadre. */
const previewLayoutChromeReservePx = computed(() => {
  const vertical =
    previewFrameMarginPx.top + previewFrameMarginPx.bottom + previewPaginationReservePx.value
  const horizontal = previewFrameMarginPx.horizontal * 2
  return { vertical, horizontal }
})

const paperDimensionPx = computed(() => ({
  width: paperDimension.value.width / COEFF_PX2MM,
  height: paperDimension.value.height / COEFF_PX2MM,
}))

const paper2PreviewScaleCoeff = computed(() => {
  const { vertical, horizontal } = previewLayoutChromeReservePx.value
  const containerHeight = Math.max(0, printPageSize.height - vertical)
  const containerWidth = Math.max(0, printPageSize.width - printFormSize.width - horizontal)
  return computeScaleCoeff(
    containerWidth,
    containerHeight,
    paperDimensionPx.value.width,
    paperDimensionPx.value.height,
  )
})

const printableAreaMm = computed(() => ({
  width: paperDimension.value.width - 2 * printFormState.margin,
  height: paperDimension.value.height - 2 * printFormState.margin,
}))

const previewDimensionPx = computed(() => ({
  width: paperDimensionPx.value.width * paper2PreviewScaleCoeff.value,
  height: paperDimensionPx.value.height * paper2PreviewScaleCoeff.value,
}))

const printMapTitleLayout = computed(() =>
  computePrintMapTitleLayout(
    printFormState.printTitle,
    printableAreaMm.value.width,
    printableAreaMm.value.height,
    printFormState.hasTitle,
  ),
)

const titleHeightMm = computed(() => printMapTitleLayout.value.titleHeightMm)

const mapTitlePreviewStyle = computed(() => {
  const layout = printMapTitleLayout.value
  const printableH = previewPrintableSizePx.value.height
  const printableAreaH = printableAreaMm.value.height
  if (!printFormState.hasTitle || !layout.titleHeightMm || !printableH || !printableAreaH) {
    return undefined
  }
  /** Même repère physique que « Légendes » (contenu export × scale), pas `--print-title-font` brut au DPI d’export. */
  const mmToPreviewY = printableH / printableAreaH
  const heightPx = layout.titleHeightMm * mmToPreviewY
  const fontPx = layout.fontSizeMm * mmToPreviewY
  const lineHeightPx = layout.lineHeightMm * mmToPreviewY
  const blockGapPx = PRINT_SUPPLEMENT_BLOCK_GAP_MM * mmToPreviewY
  return {
    height: `${heightPx}px`,
    maxHeight: `${heightPx}px`,
    fontSize: `${fontPx}px`,
    lineHeight: `${lineHeightPx}px`,
    marginBottom: `${blockGapPx}px`,
    overflow: 'hidden',
  }
})

const previewMapMinHeightPx = computed(() => {
  const printableH = previewPrintableSizePx.value.height
  const printableAreaH = printableAreaMm.value.height
  if (!printableH || !printableAreaH) return 48
  const minMapMm = printableAreaH * PRINT_MAP_MIN_MAP_HEIGHT_RATIO
  return Math.max(48, (minMapMm / printableAreaH) * printableH)
})

let printMapPrewarmGeneration = 0

const previewPrintableSizePx = computed(() => {
  const w = previewDimensionPx.value.width
  const h = previewDimensionPx.value.height
  if (!w || !h) return { width: 0, height: 0 }
  const marginLeftRight =
    (printFormState.margin / paperDimension.value.width) * previewDimensionPx.value.width
  const marginTopBottom =
    (printFormState.margin / paperDimension.value.height) * previewDimensionPx.value.height
  return {
    width: Math.max(0, w - marginLeftRight * 2),
    height: Math.max(0, h - marginTopBottom * 2),
  }
})

const supplementExportInner = computed(() =>
  computePrintSupplementInnerPx(
    paperDimension.value.width,
    paperDimension.value.height,
    printFormState.margin,
    printFormState.dpi,
  ),
)

/** Hauteur de tranche annexes (padding intérieur, distinct de la marge formulaire). */
const supplementSliceLayoutHeight = computed(() =>
  supplementSliceLayoutHeightPx(supplementExportInner.value.innerHeightPx, printFormState.dpi),
)

const supplementLayoutStyle = computed(() =>
  printSupplementCssVars(supplementExportInner.value.innerWidthPx, printFormState.dpi),
)

const measureExportInner = computed(() => {
  if (measureLayoutOverride.value) {
    return {
      innerWidthPx: measureLayoutOverride.value.innerWidthPx,
      innerHeightPx: measureLayoutOverride.value.innerHeightPx,
    }
  }
  return supplementExportInner.value
})

const measureLayoutStyle = computed(
  () => measureLayoutOverride.value?.cssVars ?? supplementLayoutStyle.value,
)

/** Une tranche d’export (même repère que la mesure / le PDF), réduite pour l’aperçu. */
const supplementPreviewFrame = computed(() => {
  const { innerWidthPx, innerHeightPx } = supplementExportInner.value
  const previewW = previewPrintableSizePx.value.width
  if (!innerWidthPx || !innerHeightPx || !previewW) {
    return { width: 0, height: 0, scale: 1, sliceHeightPx: innerHeightPx || 0 }
  }
  const scale = previewW / innerWidthPx
  const sliceH = supplementSliceLayoutHeight.value
  return {
    width: previewW,
    height: Math.max(sliceH, 1) * scale,
    scale,
    sliceHeightPx: sliceH,
  }
})

const supplementPreviewScalerStyle = computed(() => {
  const { innerWidthPx, innerHeightPx } = supplementExportInner.value
  const { scale } = supplementPreviewFrame.value
  return {
    ...supplementLayoutStyle.value,
    width: `${innerWidthPx}px`,
    height: `${innerHeightPx}px`,
    overflow: 'hidden',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
})

const supplementPreviewFrameStyle = computed(() => {
  const { width, height } = supplementPreviewFrame.value
  if (!width || !height) return {}
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
})

const supplementContentOffsetStyle = computed(() => {
  const page = currentPreviewPage.value
  if (!page || page.kind === 'map') return {}
  const offsetPx = supplementPreviewSliceStartPx.value
  if (!offsetPx) return {}
  return { marginTop: `-${offsetPx}px` }
})

function findSupplementPreviewPageRoot(): HTMLElement | null {
  const fromContent = supplementContentRef.value?.closest('.ec-print-supplement-page')
  if (fromContent instanceof HTMLElement) return fromContent
  const fromHost = supplementPreviewEl.value?.querySelector('.ec-print-supplement-page')
  return fromHost instanceof HTMLElement ? fromHost : null
}

function findSupplementPreviewFrameEl(): HTMLElement | null {
  const frame = supplementPreviewEl.value?.querySelector('.print-supplement-preview-frame')
  return frame instanceof HTMLElement ? frame : null
}

function applyCurrentSupplementSliceVisibility(): void {
  const pageRoot = findSupplementPreviewPageRoot()
  if (!pageRoot) return
  resetSupplementElementVisibility(pageRoot)

  const page = currentPreviewPage.value
  if (!page || page.kind === 'map') return

  const sliceHeightPx = supplementSliceLayoutHeight.value
  if (sliceHeightPx < 8) return

  const layoutScale = supplementPreviewFrame.value.scale * previewColumnZoom.value
  const storedStarts = supplementSliceStarts.value[page.kind]
  let sliceStartPx =
    storedStarts?.[page.sliceIndex] ??
    resolveSupplementSliceStartPx(pageRoot, page.sliceIndex, sliceHeightPx, layoutScale)
  let sliceEndPx =
    storedStarts?.[page.sliceIndex + 1] ??
    resolveSupplementSliceEndPx(pageRoot, sliceStartPx, sliceHeightPx, layoutScale)
  if (storedStarts?.[page.sliceIndex + 1] === undefined && storedStarts?.length) {
    sliceEndPx = resolveSupplementSliceEndPx(pageRoot, sliceStartPx, sliceHeightPx, layoutScale)
  }
  supplementPreviewSliceStartPx.value = sliceStartPx
  hideSupplementElementsForSlice(pageRoot, sliceStartPx, sliceEndPx, layoutScale)

  if (page.kind === 'ficheParcel') {
    const footnoteEls = pageRoot.querySelectorAll(
      '.ec-print-fiche__section--footnotes, .ec-print-fiche__footnote-callout',
    )
    const showFootnotes = ficheFootnotesVisibleForSlice(
      pageRoot,
      sliceStartPx,
      sliceEndPx,
      layoutScale,
    )
    for (const el of footnoteEls) {
      if (el instanceof HTMLElement) {
        el.style.visibility = showFootnotes ? '' : 'hidden'
      }
    }
  }
}

watch(
  () =>
    [
      currentPreviewPage.value?.id,
      supplementSliceStarts.value,
      isPreviewLayoutPending.value,
      supplementExportInner.value.innerHeightPx,
      supplementSliceLayoutHeight.value,
      supplementPreviewFrame.value.scale,
      previewColumnZoom.value,
    ] as const,
  () => {
    if (isPreviewLayoutPending.value) return
    void nextTick(() => {
      requestAnimationFrame(() => {
        applyCurrentSupplementSliceVisibility()
        void remeasureSupplementFromVisiblePreview()
      })
    })
  },
)

const cssPreviewDimensionPx = computed(() => ({
  width: `${previewDimensionPx.value.width}px`,
  height: `${previewDimensionPx.value.height}px`,
}))

const cssPreviewPaddingPx = computed(() => {
  const leftRightPx =
    (printFormState.margin / paperDimension.value.width) * previewDimensionPx.value.width
  const topBottomPx =
    (printFormState.margin / paperDimension.value.height) * previewDimensionPx.value.height
  return {
    left: `${leftRightPx}px`,
    right: `${leftRightPx}px`,
    top: `${topBottomPx}px`,
    bottom: `${topBottomPx}px`,
  }
})

/** Gabarit papier / DPI uniquement (masque « Préparation de l’aperçu… »). */
const previewLayoutMeasureDeps = computed(
  () =>
    [
      printFormState.paperFormat,
      printFormState.pageOrientation,
      printFormState.margin,
      printFormState.dpi,
      supplementExportInner.value.innerWidthPx,
      supplementExportInner.value.innerHeightPx,
    ] as const,
)

watch(previewLayoutMeasureDeps, () => {
  if (!printModalOpened.value) return
  logPrintPreview('gabarit: changement (debounce mesure)')
})

watchDebounced(
  previewLayoutMeasureDeps,
  () => {
    if (!printModalOpened.value) return
    supplementSlicePlanByKey.clear()
    logPrintPreview('gabarit: relance mesure complète')
    void remeasureSupplementPageCounts()
  },
  { debounce: 120, maxWait: 400 },
)

/**
 * Contenu annexes (fiches / légendes) : remesure discrète, sans overlay.
 * - Territoire : onglets fiche uniquement.
 * - Parcelle : HTML + bande pictos lowscale/highscale (pas le zoom continu).
 * - Légendes filtrées : zoom aperçu ; « Toutes les légendes » : pile complète, sans zoom.
 */
watchDebounced(
  annexContentSnapshot,
  (next) => {
    if (!printModalOpened.value || isExportInProgress.value) return
    const kinds = annexKindsToInvalidateForContentChange(lastAnnexContentSnapshot, next)
    lastAnnexContentSnapshot = next
    if (!kinds.length) return
    invalidateAnnexSlicePlanCacheForKinds(kinds)
    logPrintPreview('contenu annexes: remesure discrète', { kinds })
    void remeasureSupplementPageCounts({ blockPreview: false })
  },
  { debounce: 280, maxWait: 700 },
)

let previewViewCustomizationListeners: EventsKey[] = []
const previewMapViewCustomized = ref(false)
let suppressPreviewViewCustomizationTracking = 0

function clearPreviewViewCustomizationListeners(): void {
  unByKey(previewViewCustomizationListeners)
  previewViewCustomizationListeners = []
}

function runWithoutPreviewViewCustomizationTracking(fn: () => void): void {
  suppressPreviewViewCustomizationTracking += 1
  try {
    fn()
  } finally {
    void nextTick(() => {
      suppressPreviewViewCustomizationTracking = Math.max(
        0,
        suppressPreviewViewCustomizationTracking - 1,
      )
    })
  }
}

function markPreviewMapViewCustomized(): void {
  if (suppressPreviewViewCustomizationTracking > 0) return
  if (isExportInProgress.value) return
  previewMapViewCustomized.value = true
}

function attachPreviewViewCustomizationListeners(): void {
  clearPreviewViewCustomizationListeners()
  const preview = previewMap.value
  if (!preview) return
  const view = preview.getView()
  const handler = () => markPreviewMapViewCustomized()
  previewViewCustomizationListeners = [
    view.on('change:center', handler),
    view.on('change:resolution', handler),
    view.on('change:rotation', handler),
  ]
}

/** Vue / couches carte principale au dernier fermeture de la modale (réouverture sans recalcul). */
let printPreviewSessionSourceViewKey = ''
let printPreviewSessionViewCustomized = false

function computeSourceMapViewKey(): string {
  const source = sourceMapRef.value
  if (!source) return ''
  const view = source.getView()
  const center = view.getCenter()
  const resolution = view.getResolution()
  return [
    center?.map((value) => value.toFixed(2)).join(',') ?? '',
    resolution?.toFixed(8) ?? '',
    view.getRotation().toFixed(6),
    buildVisibleLayerFingerprint(source),
  ].join('|')
}

function detachPreviewMap(): void {
  clearPreviewViewCustomizationListeners()
  previewMap.value?.setTarget(undefined)
}

function destroyPreviewMap(): void {
  clearPreviewViewCustomizationListeners()
  previewMapViewCustomized.value = false
  previewMap.value?.setTarget(undefined)
  previewMap.value?.dispose()
  previewMap.value = null
}

function syncPreviewFromSource(): void {
  if (isExportInProgress.value) return
  const source = sourceMapRef.value
  const preview = previewMap.value
  if (!source || !preview) return
  runWithoutPreviewViewCustomizationTracking(() => {
    copyViewState(source.getView(), preview.getView())
    preview.renderSync()
  })
  previewMapViewCustomized.value = false
}

function replacerPreviewMapFromSource(): void {
  syncPreviewFromSource()
}

function createScaleLineControl(): ScaleLine {
  return new ScaleLine({
    units: 'metric',
    minWidth: 100,
    bar: false,
  })
}

function createPreviewControls(): (Attribution | ScaleLine)[] {
  const controls: (Attribution | ScaleLine)[] = [new Attribution({ collapsible: false })]
  if (printFormState.hasScale) {
    controls.push(createScaleLineControl())
  }
  return controls
}

function syncPreviewScaleLineControl(): void {
  const map = previewMap.value
  if (!map) return
  const controls = map.getControls().getArray()
  for (const control of controls) {
    if (control instanceof ScaleLine) {
      map.removeControl(control)
    }
  }
  if (printFormState.hasScale) {
    map.addControl(createScaleLineControl())
  }
  configureDisplayOnlyOlControls(map)
  map.renderSync()
}

function wirePreviewMapDisplayControls(map: Map): void {
  configureDisplayOnlyOlControls(map)
  map.getControls().on('add', () => configureDisplayOnlyOlControls(map))
}

async function ensurePreviewMap(forceRecreate = false): Promise<Map | null> {
  if (isExportInProgress.value && !forceRecreate) {
    return previewMap.value
  }
  const source = sourceMapRef.value
  const target = previewMapEl.value
  if (!source || !target) {
    logPrintPreview('carte aperçu: cible indisponible', {
      hasSource: Boolean(source),
      hasTarget: Boolean(target),
    })
    return null
  }
  logPrintPreview('carte aperçu: construction…', { forceRecreate })

  if (previewMap.value && !forceRecreate) {
    if (previewMap.value.getTargetElement() !== target) {
      previewMap.value.setTarget(target)
      attachPreviewViewCustomizationListeners()
    }
    rebuildPrintPreviewMap(source, previewMap.value, { syncViewFromSource: false })
    previewMap.value.updateSize()
    previewMap.value.renderSync()
    sanitizePrintPreviewAttributions(previewMapEl.value)
    schedulePrintMapPrewarm()
    return previewMap.value
  }

  destroyPreviewMap()
  const view = source.getView()
  const map = new Map({
    target,
    view: new View({
      center: view.getCenter(),
      resolution: view.getResolution(),
      rotation: view.getRotation(),
      projection: view.getProjection(),
    }),
    controls: createPreviewControls(),
  })
  runWithoutPreviewViewCustomizationTracking(() => {
    rebuildPrintPreviewMap(source, map, { syncViewFromSource: forceRecreate })
  })
  previewMap.value = map
  wirePreviewMapDisplayControls(map)
  attachPreviewViewCustomizationListeners()
  if (forceRecreate) {
    previewMapViewCustomized.value = false
  }
  await nextTick()
  map.updateSize()
  await waitForMapRender(map, 2)
  sanitizePrintPreviewAttributions(previewMapEl.value)
  logPrintPreview('carte aperçu: prête')
  schedulePrintMapPrewarm()
  return map
}

function previewNeedsSourceViewResync(sourceViewKey: string): boolean {
  return (
    Boolean(previewMap.value) &&
    !printPreviewSessionViewCustomized &&
    Boolean(printPreviewSessionSourceViewKey) &&
    sourceViewKey !== printPreviewSessionSourceViewKey
  )
}

/** Réouverture modale : resync vue avant tuiles (évite d’attendre l’ancienne emprise). */
async function preparePreviewMapOnModalOpen(): Promise<void> {
  const sourceViewKey = computeSourceMapViewKey()
  const reusePreviewMap = Boolean(previewMap.value)
  const needsViewResync = previewNeedsSourceViewResync(sourceViewKey)

  if (!reusePreviewMap) {
    await ensurePreviewMap(true)
    printPreviewSessionSourceViewKey = sourceViewKey
    return
  }

  const source = sourceMapRef.value
  const target = previewMapEl.value
  const preview = previewMap.value
  if (!source || !target || !preview) {
    await ensurePreviewMap(true)
    printPreviewSessionSourceViewKey = sourceViewKey
    return
  }

  if (preview.getTargetElement() !== target) {
    preview.setTarget(target)
    attachPreviewViewCustomizationListeners()
  }

  if (needsViewResync) {
    logPrintPreview('carte principale modifiée: resync aperçu')
    isPreviewLayoutPending.value = true
    try {
      syncPreviewFromSource()
      rebuildPrintPreviewMap(source, preview, { syncViewFromSource: false })
      preview.updateSize()
      preview.renderSync()
      await waitForMapRender(preview, 2)
      sanitizePrintPreviewAttributions(previewMapEl.value)
    } finally {
      isPreviewLayoutPending.value = false
    }
  } else {
    rebuildPrintPreviewMap(source, preview, { syncViewFromSource: false })
    preview.updateSize()
    preview.renderSync()
    sanitizePrintPreviewAttributions(previewMapEl.value)
  }

  printPreviewSessionSourceViewKey = sourceViewKey
  schedulePrintMapPrewarm()
}

watchDebounced(
  () =>
    [
      printModalOpened.value,
      isPreviewLayoutPending.value,
      printFormState.dpi,
      printFormState.margin,
      printFormState.hasTitle,
      printFormState.printTitle,
      printFormState.paperFormat,
      printFormState.pageOrientation,
      previewPageIndex.value,
      previewMapViewCustomized.value,
    ] as const,
  () => {
    if (printModalOpened.value && !isPreviewLayoutPending.value) schedulePrintMapPrewarm()
  },
  { debounce: 1500 },
)

watch(printModalOpened, async (isOpen) => {
  if (!isOpen) {
    printFicheLoadGeneration += 1
    printFicheSelections.value = null
    clearPrintMapRenderCache()
    printPreviewSessionViewCustomized = previewMapViewCustomized.value
    printPreviewSessionSourceViewKey = computeSourceMapViewKey()
    detachPreviewMap()
    isPreviewLayoutPending.value = false
    lastAnnexContentSnapshot = null
    logPrintPreview('modale fermée')
    return
  }
  logPrintPreview('modale ouverte')
  try {
    syncPrintFicheSelectionsFromCache()
    await nextTick()
    syncNativePrintDialog()
    await preparePreviewMapOnModalOpen()
    syncNativePrintDialog()
    await refreshPrintFicheSelections()
  } catch (err) {
    logPrintPreview('modale ouverte: erreur', err)
    isPreviewLayoutPending.value = false
  }
})

watch(
  () => printFormState.hasScale,
  () => {
    if (!printModalOpened.value) return
    void nextTick(() => syncPreviewScaleLineControl())
  },
)

watch(
  () =>
    [
      paper2PreviewScaleCoeff.value,
      printFormState.pageOrientation,
      printFormState.paperFormat,
    ] as const,
  () => {
    if (!printModalOpened.value) return
    void nextTick(() => {
      previewMap.value?.updateSize()
      previewMap.value?.renderSync()
    })
  },
)

onUnmounted(() => destroyPreviewMap())

function getPrintMapInstance(): Map | null {
  if (printModalOpened.value) return previewMap.value
  return previewMap.value ?? sourceMapRef.value
}

function triggerDownload(fileName: string, url: string): void {
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  link.click()
}

async function ensureMapPreviewPageVisibleForExport(): Promise<number> {
  const savedIndex = previewPageIndex.value
  const mapIndex = previewPages.value.findIndex((p) => p.kind === 'map')
  if (mapIndex >= 0 && previewPageIndex.value !== mapIndex) {
    previewPageIndex.value = mapIndex
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    previewMap.value?.updateSize()
    if (previewMap.value) {
      await waitForMapRender(previewMap.value, 2)
    }
    sanitizePrintPreviewAttributions(previewMapEl.value)
  }
  return savedIndex
}

function buildExportProgressSteps(): { weight: number }[] {
  const steps: { weight: number }[] = []
  if (previewPages.value.some((page) => page.kind === 'map')) {
    steps.push({ weight: 55 })
  }
  const annexCount = previewPages.value.filter((page) => page.kind !== 'map').length
  if (annexCount > 0) {
    const each = 35 / annexCount
    for (let i = 0; i < annexCount; i += 1) steps.push({ weight: each })
  }
  steps.push({ weight: 10 })
  return steps
}

function syncExportProgressUi(percent: number, detail: string): void {
  exportProgressPercent.value = percent
  exportProgressDetail.value = detail
}

async function buildRasterExportCanvas(
  progress: WeightedExportProgress,
  stepIndex: number,
  pagePrefix = '',
): Promise<{
  dpiValue: number
  finalCanvas: HTMLCanvasElement
}> {
  const prefix = pagePrefix ? `${pagePrefix} — ` : ''
  progress.startStep(stepIndex, `${prefix}Préparation de la page carte…`)
  progress.tick(0.02)
  progress.setDetail(`${prefix}Affichage de l’aperçu carte…`)
  const restorePreviewIndex = await ensureMapPreviewPageVisibleForExport()
  progress.tick(0.05)
  progress.setDetail(`${prefix}Calcul des dimensions d’export…`)
  const dpiValue = printFormState.dpi
  const paperWidthPx = convertMmToPx(paperDimension.value.width, dpiValue)
  const paperHeightPx = convertMmToPx(paperDimension.value.height, dpiValue)
  const marginPx = convertMmToPx(printFormState.margin, dpiValue)
  const printableHeightPx = Math.max(0, paperHeightPx - marginPx * 2)
  const titleHeightPx = printFormState.hasTitle
    ? Math.round((titleHeightMm.value / printableAreaMm.value.height) * printableHeightPx)
    : 0
  const mapWidthPx = Math.max(0, paperWidthPx - marginPx * 2)
  const mapHeightPx = Math.max(0, printableHeightPx - titleHeightPx)
  if (mapHeightPx < 16 || mapWidthPx < 16) {
    throw new Error(
      'Zone carte insuffisante pour l’export. Réduisez le titre, les marges ou choisissez un format plus grand.',
    )
  }

  const mapElement = previewMapEl.value
  const scaleSnapshot =
    printFormState.hasScale && dpiValue === HIGH_DPI_VALUE && mapElement
      ? captureScaleLineSnapshot(mapElement, paper2PreviewScaleCoeff.value)
      : null

  const map = getPrintMapInstance()
  if (!map) throw new Error('Carte indisponible pour l’export.')
  progress.setDetail(`${prefix}Synchronisation de la vue carte…`)
  progress.tick(0.08)
  await waitForMapRender(map, 2)
  sanitizePrintPreviewAttributions(previewMapEl.value)
  const previewSize = map.getSize()
  const mapExtent = map.getView().calculateExtent(previewSize ?? undefined)
  const mapCacheKey = buildPrintMapRenderCacheKey({
    dpi: dpiValue,
    mapWidthPx,
    mapHeightPx,
    extent: mapExtent,
    layerFingerprint: buildVisibleLayerFingerprint(map),
    rotation: map.getView().getRotation(),
  })

  const mapCanvas = await renderOffscreenPrintMapCanvas(map, {
    widthPx: mapWidthPx,
    heightPx: mapHeightPx,
    extent: mapExtent,
    cacheKey: mapCacheKey,
    onStage: (label) => {
      progress.setDetail(`${prefix}${label}`)
    },
    onTileProgress: (loadedTiles, pendingTiles) => {
      const total = loadedTiles + pendingTiles
      const ratio = total > 0 ? loadedTiles / total : 0
      progress.tick(0.15 + ratio * 0.65)
    },
  })
  progress.setDetail(`${prefix}Composition (titre, échelle, attributions)…`)
  progress.tick(0.85)

  const finalWidthPx = mapWidthPx + marginPx * 2
  const finalHeightPx = mapHeightPx + titleHeightPx + marginPx * 2
  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = finalWidthPx
  finalCanvas.height = finalHeightPx
  const finalCtx = finalCanvas.getContext('2d')
  if (!finalCtx) throw new Error('Contexte canvas indisponible.')
  finalCtx.fillStyle = '#ffffff'
  finalCtx.fillRect(0, 0, finalWidthPx, finalHeightPx)
  finalCtx.drawImage(mapCanvas, marginPx, marginPx + titleHeightPx)
  mapCanvas.remove()

  if (printFormState.hasTitle && printMapTitleLayout.value.displayTitle) {
    const titleCanvas = document.createElement('canvas')
    titleCanvas.width = mapWidthPx
    titleCanvas.height = titleHeightPx
    const titleCtx = titleCanvas.getContext('2d')
    if (titleCtx) {
      drawPrintMapTitleOnCanvas(
        titleCtx,
        mapWidthPx,
        titleHeightPx,
        printMapTitleLayout.value,
        dpiValue,
      )
      finalCtx.drawImage(titleCanvas, marginPx, marginPx)
    }
    titleCanvas.remove()
  }

  if (mapElement) {
    const overlayCanvas = document.createElement('canvas')
    overlayCanvas.width = mapWidthPx
    overlayCanvas.height = mapHeightPx
    const overlayCtx = overlayCanvas.getContext('2d')
    if (overlayCtx) {
      await drawAttributionOnMapExport(overlayCtx, mapElement, mapHeightPx)
      if (printFormState.hasScale) {
        drawScale(
          overlayCtx,
          mapElement,
          mapWidthPx,
          mapHeightPx,
          scaleSnapshot,
          paper2PreviewScaleCoeff.value,
        )
      }
      finalCtx.drawImage(overlayCanvas, marginPx, marginPx + titleHeightPx)
    }
    overlayCanvas.remove()
  }

  previewPageIndex.value = restorePreviewIndex
  await nextTick()
  progress.tick(1)
  progress.endStep()

  return { dpiValue, finalCanvas }
}

/** Export annexe = capture du cadre d’aperçu (WYSIWYG), upscalée au DPI d’export. */
async function exportSupplementPageFromPreview(
  onStage?: (label: string) => void,
): Promise<HTMLCanvasElement | null> {
  const pageMeta = currentPreviewPage.value
  if (!pageMeta || pageMeta.kind === 'map') return null

  onStage?.('Préparation de l’aperçu…')
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const pageRoot = findSupplementPreviewPageRoot()
  const previewFrame = findSupplementPreviewFrameEl()
  if (!pageRoot || !previewFrame) return null

  onStage?.('Chargement des images…')
  await waitForPrintSupplementImages(pageRoot, { timeoutMs: 8_000 })
  applyCurrentSupplementSliceVisibility()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  onStage?.('Capture de la page…')
  return rasterizePrintSupplementPreviewFrame(
    previewFrame,
    paperDimension.value.width,
    paperDimension.value.height,
    printFormState.margin,
    printFormState.dpi,
  )
}

async function captureAllExportCanvases(
  progress: WeightedExportProgress,
): Promise<HTMLCanvasElement[]> {
  const savedIndex = previewPageIndex.value
  const canvases: HTMLCanvasElement[] = []
  let mapCanvas: HTMLCanvasElement | null = null
  let progressStep = 0
  const totalPages = previewPages.value.length
  try {
    for (let index = 0; index < previewPages.value.length; index += 1) {
      const page = previewPages.value[index]
      if (!page) continue
      const pagePrefix = `Page ${index + 1}/${totalPages}`
      if (page.kind === 'map') {
        if (!mapCanvas) {
          mapCanvas = (await buildRasterExportCanvas(progress, progressStep, pagePrefix))
            .finalCanvas
          progressStep += 1
        }
        if (mapCanvas) canvases.push(mapCanvas)
        continue
      }
      previewPageIndex.value = index
      progress.startStep(progressStep, `${pagePrefix} — ${page.label}…`)
      progress.tick(0.03)
      const sliceCanvas = await exportSupplementPageFromPreview((detail) => {
        progress.setDetail(`${pagePrefix} — ${detail}`)
        if (detail.startsWith('Chargement')) progress.tick(0.4)
        else if (detail.startsWith('Capture')) progress.tick(0.72)
        else progress.tick(0.12)
      })
      progress.tick(1)
      progress.endStep()
      progressStep += 1
      if (sliceCanvas) canvases.push(sliceCanvas)
    }
  } finally {
    previewPageIndex.value = savedIndex
    await nextTick()
  }
  return canvases
}

async function exportRasterCanvases(
  canvases: HTMLCanvasElement[],
  progress: WeightedExportProgress,
): Promise<void> {
  const dpiValue = printFormState.dpi
  const ext = printFormState.format === 'JPEG' ? 'jpeg' : 'png'
  for (let i = 0; i < canvases.length; i += 1) {
    const canvas = canvases[i]
    const suffix = canvases.length > 1 ? ` - page ${i + 1}` : ''
    const fileName = `carte${suffix}.${ext}`
    const encodeLabel =
      printFormState.format === 'PNG'
        ? `Encodage PNG${canvases.length > 1 ? ` (${i + 1}/${canvases.length})` : ''}…`
        : `Encodage JPEG${canvases.length > 1 ? ` (${i + 1}/${canvases.length})` : ''}…`
    progress.setDetail(encodeLabel)
    progress.tick(canvases.length > 0 ? (i / canvases.length) * 0.85 : 0)
    try {
      if (printFormState.format === 'PNG') {
        const blob = await encodePrintPngWithDpi(canvas, dpiValue)
        triggerDownload(fileName, URL.createObjectURL(blob))
      } else {
        const blob = await encodePrintJpeg(canvas, 0.95)
        triggerDownload(fileName, URL.createObjectURL(blob))
      }
    } catch {
      if (printFormState.format === 'PNG') {
        const finalUrl = await injectDpiInPng(canvas.toDataURL('image/png'), dpiValue)
        triggerDownload(fileName, finalUrl)
      } else {
        triggerDownload(fileName, canvas.toDataURL('image/jpeg', 0.95))
      }
    }
    canvas.remove()
  }
  progress.tick(0.95)
}

async function exportPdfFromCanvases(
  pages: HTMLCanvasElement[],
  progress: WeightedExportProgress,
): Promise<void> {
  const fileName = pages.length > 1 ? 'carte-et-annexes.pdf' : 'carte.pdf'
  progress.setDetail(
    pages.length > 1 ? `Assemblage PDF (${pages.length} pages)…` : 'Génération du PDF…',
  )
  progress.tick(0.1)
  const blob = await encodePrintPdf({
    canvases: pages,
    paperWidthMm: paperDimension.value.width,
    paperHeightMm: paperDimension.value.height,
    orientation: printFormState.pageOrientation,
  })
  progress.setDetail('Finalisation du PDF…')
  progress.tick(0.85)
  triggerDownload(fileName, URL.createObjectURL(blob))
  for (const canvas of pages) canvas.remove()
}

async function syncAnnexPaginationForExport(
  onStage: (label: string, percent: number) => void,
): Promise<void> {
  const hasAnnex =
    (printFormState.hasTerritoryFiche && canPrintTerritoryFiche.value) ||
    (printFormState.hasParcelFiche && canPrintParcelFiche.value) ||
    (printFormState.hasLegends && canPrintLegends.value)
  if (!hasAnnex) {
    onStage('Aucune annexe à synchroniser.', 8)
    return
  }
  onStage('Synchronisation des annexes avec la vue carte…', 2)
  if (printFormState.hasLegends && canPrintLegends.value) {
    invalidateLegendsSlicePlanCache()
  }
  let stagePercent = 3
  await remeasureSupplementPageCounts({
    blockPreview: false,
    onStage: (label) => {
      stagePercent = Math.min(7, stagePercent + 1)
      onStage(label, stagePercent)
    },
  })
  onStage('Pagination des annexes à jour.', 8)
}

async function onClickExportMap(): Promise<void> {
  if (isExportInProgress.value) return
  isExportInProgress.value = true
  exportProgressPercent.value = 1
  exportProgressDetail.value = 'Préparation de l’export…'
  const savedPreviewPageIndex = previewPageIndex.value
  const finalizeStepIndexRef = { value: 0 }
  try {
    await syncAnnexPaginationForExport((label, percent) => {
      syncExportProgressUi(percent, label)
    })
    const progressSteps = buildExportProgressSteps()
    const progress = new WeightedExportProgress(progressSteps, syncExportProgressUi)
    finalizeStepIndexRef.value = progressSteps.length - 1
    const canvases = await captureAllExportCanvases(progress)
    if (!canvases.length) return
    progress.startStep(finalizeStepIndexRef.value, 'Génération du fichier…')
    progress.tick(0.02)
    if (printFormState.format === 'PDF') {
      await exportPdfFromCanvases(canvases, progress)
    } else {
      await exportRasterCanvases(canvases, progress)
    }
    progress.endStep()
    syncExportProgressUi(100, 'Export terminé.')
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Export impossible. Réessayez avec un titre plus court.'
    syncExportProgressUi(exportProgressPercent.value, message)
  } finally {
    previewPageIndex.value = savedPreviewPageIndex
    await nextTick()
    isExportInProgress.value = false
    exportProgressPercent.value = 0
    exportProgressDetail.value = ''
  }
}
</script>

<template>
  <Teleport to="body">
    <DsfrModal
      :opened="printModalOpened"
      :title="title"
      :size="size"
      :disable-outside-interaction="true"
      @close="onModalPrintClose"
    >
      <div ref="printPage" class="print-page">
        <div ref="printForm" class="print-form">
          <DsfrSelect
            v-model="selectedPrintTemplateId"
            label="Modèle d'impression"
            :options="printTemplateSelectOptions"
            class="mb-20"
          />
          <DsfrSegmentedSet
            v-model="printFormState.pageOrientation"
            :inline="false"
            :options="pageOrientationOptions"
            :small="false"
            legend="Mise en page"
            class="mb-20"
          />
          <DsfrSelect
            v-model="printFormState.paperFormat"
            label="Dimensions"
            :options="paperFormatOptions"
          />
          <DsfrSelect
            v-model.number="printFormState.margin"
            label="Marge"
            :options="[
              { value: 0, text: 'Pas de marge - 0mm' },
              { value: 5, text: 'Petite marge - 5mm' },
              { value: 10, text: 'Grosse marge - 10mm' },
            ]"
          />
          <DsfrInput
            v-model="printFormState.printTitle"
            :disabled="!printFormState.hasTitle"
            :maxlength="PRINT_MAP_TITLE_MAX_CHARS"
            label="Titre de la carte"
            label-visible
            name="titre"
            class="mb-10"
          />
          <p v-if="printFormState.hasTitle" class="fr-text--xs fr-mb-2w print-form__title-hint">
            100 caractères maximum. Un titre long réduit automatiquement la taille du texte.
          </p>
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasTitle"
              :value="true"
              name="ec-map-print-has-title"
              label="Afficher le titre"
            />
          </div>
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasScale"
              :value="true"
              name="ec-map-print-has-scale"
              label="Afficher l'échelle"
            />
          </div>
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasTerritoryFiche"
              :value="true"
              name="ec-map-print-fiche-territoire"
              :disabled="!canPrintTerritoryFiche"
              label="Afficher la fiche info territoire"
            />
          </div>
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasParcelFiche"
              :value="true"
              name="ec-map-print-fiche-parcelle"
              :disabled="!canPrintParcelFiche"
              label="Afficher la fiche info parcelle"
            />
          </div>
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasLegends"
              :value="true"
              name="ec-map-print-legends"
              :disabled="!canPrintLegends"
              label="Afficher la légende"
            />
          </div>
          <div class="mt-10 ec-map-print-form__indent">
            <DsfrCheckbox
              v-model="printFormState.hasAllLegends"
              :value="true"
              name="ec-map-print-all-legends"
              :disabled="!printFormState.hasLegends"
              label="Toutes les légendes"
            />
          </div>
          <DsfrSelect
            v-model="printFormState.format"
            label="Format d'export"
            :options="['PDF', 'PNG', 'JPEG']"
          />
          <DsfrSelect
            v-model.number="printFormState.dpi"
            label="Résolution"
            :options="dpiOptions"
          />
          <DsfrButton
            id="print-page-reset-map-view"
            class="print-form__replacer-carte"
            label="Replacer la carte"
            title="Replacer la carte"
            secondary
            :disabled="
              !previewMapViewCustomized ||
              isExportInProgress ||
              isPreviewLayoutPending ||
              !previewMap
            "
            icon=""
            @click="replacerPreviewMapFromSource"
          />
          <DsfrButton
            id="print-page-export"
            :label="isExportInProgress ? 'Traitement en cours...' : 'Exporter'"
            :title="isExportInProgress ? 'Traitement en cours...' : 'Exporter'"
            :disabled="isExportInProgress || isPreviewLayoutPending"
            icon=""
            no-outline
            @click="onClickExportMap"
          />
        </div>
        <div class="print-preview-panel">
          <nav
            ref="previewPaginationEl"
            class="print-preview-pagination"
            aria-label="Pages à imprimer"
          >
            <button
              v-if="previewPages.length > 1"
              type="button"
              class="fr-btn fr-btn--tertiary fr-btn--sm"
              aria-label="Page précédente"
              @click="goPreviewPage(-1)"
            >
              <span class="fr-icon-arrow-left-s-line" aria-hidden="true" />
            </button>
            <span class="print-preview-pagination__label">
              Page {{ previewPageIndex + 1 }} / {{ previewPages.length }} —
              {{ currentPreviewPage?.label }}
            </span>
            <button
              v-if="previewPages.length > 1"
              type="button"
              class="fr-btn fr-btn--tertiary fr-btn--sm"
              aria-label="Page suivante"
              @click="goPreviewPage(1)"
            >
              <span class="fr-icon-arrow-right-s-line" aria-hidden="true" />
            </button>
          </nav>
          <div
            class="print-preview-column"
            title="Ctrl + molette : zoomer l’aperçu (hors carte)"
            @wheel="onPreviewColumnWheel"
          >
            <div
              class="print-preview-column__viewport"
              :class="{ 'print-preview-column__viewport--pending': isPreviewLayoutPending }"
            >
              <div class="print-preview-column__scale-slot" :style="previewColumnScaleSlotStyle">
                <div
                  ref="previewZoomHostEl"
                  class="print-preview-column__scale-inner"
                  :style="previewColumnScaleInnerStyle"
                >
                  <div class="print-preview-container">
                    <div
                      class="print-preview"
                      :style="{
                        width: cssPreviewDimensionPx.width,
                        height: cssPreviewDimensionPx.height,
                        paddingLeft: cssPreviewPaddingPx.left,
                        paddingRight: cssPreviewPaddingPx.right,
                        paddingTop: cssPreviewPaddingPx.top,
                        paddingBottom: cssPreviewPaddingPx.bottom,
                        ...supplementLayoutStyle,
                      }"
                    >
                      <div v-show="currentPreviewPage?.kind === 'map'" class="print-preview-page">
                        <div
                          v-if="printFormState.hasTitle"
                          id="map-title"
                          class="map-title"
                          :style="mapTitlePreviewStyle"
                        >
                          {{ printMapTitleLayout.displayTitle }}
                        </div>
                        <div
                          v-if="printModalOpened"
                          ref="previewMapEl"
                          class="map ec-map-print-preview-map"
                          :style="{ minHeight: `${previewMapMinHeightPx}px` }"
                        />
                      </div>
                      <div
                        v-show="currentPreviewPage?.kind !== 'map'"
                        ref="supplementPreviewEl"
                        class="print-preview-page print-preview-page--supplement"
                      >
                        <div
                          class="print-supplement-preview-frame"
                          :style="supplementPreviewFrameStyle"
                        >
                          <div
                            class="print-supplement-layout-root"
                            :style="supplementPreviewScalerStyle"
                          >
                            <div
                              ref="supplementContentRef"
                              class="print-preview-supplement-content"
                              :style="supplementContentOffsetStyle"
                            >
                              <MapPrintFicheTerritoryPage
                                v-if="
                                  printModalOpened && currentPreviewPage?.kind === 'ficheTerritory'
                                "
                                :document-tabs="territoryDocumentTabs"
                                :title="territoryPrintTitle(territorySelectionForPrint)"
                              />
                              <MapPrintFicheParcelPage
                                v-if="
                                  printModalOpened && currentPreviewPage?.kind === 'ficheParcel'
                                "
                                :title="parcelPrintTitle(parcelSelectionForPrint)"
                                :infos-html="parcelInfosHtml"
                                :documents-html="parcelDocumentsHtml"
                                :cadastre-references="parcelCadastreReferences"
                              />
                              <MapPrintLegendsPage
                                v-if="printModalOpened && currentPreviewPage?.kind === 'legends'"
                                :layers="printLegendLayerSource"
                                :map-zoom="printPreviewLegendZoom"
                                :catalog-entry-in-zoom-range="catalogEntryInZoomRangeForPrint"
                                :include-all-legend-layers="printFormState.hasAllLegends"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="isPreviewLayoutPending"
                class="print-preview-patience"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                Préparation de l’aperçu…
              </div>
            </div>
          </div>
        </div>
        <PrintExportProgressOverlay
          v-if="isExportInProgress"
          :percent="exportProgressPercent"
          :detail="exportProgressDetail"
        />
      </div>
    </DsfrModal>
    <div ref="supplementMeasureInnerRef" class="print-supplement-measure" aria-hidden="true">
      <div
        class="print-supplement-measure__viewport"
        :style="{
          width: `${measureExportInner.innerWidthPx}px`,
        }"
      >
        <div
          class="print-supplement-measure__content"
          :style="{
            ...measureLayoutStyle,
            width: `${measureExportInner.innerWidthPx}px`,
          }"
        >
          <MapPrintFicheTerritoryPage
            v-if="measureKind === 'ficheTerritory'"
            :document-tabs="territoryDocumentTabs"
            :title="territoryPrintTitle(territorySelectionForPrint)"
          />
          <MapPrintFicheParcelPage
            v-if="measureKind === 'ficheParcel'"
            :title="parcelPrintTitle(parcelSelectionForPrint)"
            :infos-html="parcelInfosHtml"
            :documents-html="parcelDocumentsHtml"
            :cadastre-references="parcelCadastreReferences"
          />
          <MapPrintLegendsPage
            v-if="measureKind === 'legends'"
            :layers="printLegendLayerSource"
            :map-zoom="printPreviewLegendZoom"
            :catalog-entry-in-zoom-range="catalogEntryInZoomRangeForPrint"
            :include-all-legend-layers="printFormState.hasAllLegends"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mb-20 {
  margin-bottom: 12px;
}

.mb-10 {
  margin-bottom: 6px;
}

.mt-10 {
  margin-top: 6px;
}

.ec-map-print-form__indent {
  padding-left: 1.25rem;
}

.print-page {
  display: flex;
  flex-direction: row;
  min-height: min(35rem, calc(100dvh - 6rem));
  height: auto;
  position: relative;
}

.print-preview-panel {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  box-sizing: border-box;
}

.print-preview-column {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  overflow: auto;
  box-sizing: border-box;
}

.print-preview-column__viewport {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.print-preview-column__viewport--pending .print-preview-column__scale-slot {
  pointer-events: none;
}

.print-preview-column__scale-slot {
  flex: 0 0 auto;
  max-width: none;
  margin: 0 auto;
  overflow: visible;
}

.print-preview-column__scale-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: max-content;
  max-width: 100%;
  box-sizing: border-box;
}

.print-preview-patience {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.45);
  color: #161616;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  pointer-events: none;
}

.print-preview-container {
  flex: 0 0 auto;
  justify-content: flex-start;
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  margin: 6px auto 12px;
  box-shadow: 3px 3px 5px 6px #ccc;
}

.print-preview-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.print-preview-page--supplement {
  background: #fff;
  min-height: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.print-supplement-preview-frame {
  position: relative;
  flex: 0 0 auto;
  overflow: hidden;
  box-sizing: border-box;
  background: #fff;
}

.print-preview-supplement-content {
  width: 100%;
  height: auto;
}

.print-supplement-measure {
  position: fixed;
  left: -10000px;
  top: 0;
  pointer-events: none;
  z-index: -1;
  overflow: visible;
}

.print-supplement-measure__viewport {
  box-sizing: border-box;
  overflow: visible;
}

.print-supplement-measure__content {
  box-sizing: border-box;
  overflow: visible;
}

.print-preview-pagination {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  padding: 0.15rem 0.5rem 0;
  box-sizing: border-box;
}

.print-preview-pagination__label {
  font-size: 0.8125rem;
  text-align: center;
}

.print-preview {
  flex: 0 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.print-form {
  flex: 0 0 230px;
  margin-right: 10px;
  max-height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  align-self: stretch;
}

.print-form :deep(.fr-select-group),
.print-form :deep(.fr-input-group),
.print-form :deep(.fr-checkbox-group),
.print-form :deep(.fr-fieldset) {
  margin-bottom: 8px;
}

.print-form__replacer-carte {
  margin-top: 12px;
  margin-bottom: 8px;
  width: 100%;
}

.print-form__title-hint {
  margin-top: -0.25rem;
  color: var(--text-mention-grey, #666);
}

.map-title {
  flex: 0 0 auto;
  margin: 0;
  font-weight: 700;
  text-align: center;
  color: #161616;
}

.map {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  position: relative;
  background: #fff;
}

.map :deep(.ol-viewport) {
  position: absolute !important;
  inset: 0 !important;
}

.ec-map-print-preview-map {
  --ec-scale-line-right: 6px;
  --ec-widget-gap: 4px;
  --ec-attribution-logo-width: 32px;
  --ec-attribution-logo-height: 34px;
  --ec-attribution-block-height: calc(var(--ec-attribution-logo-height) + 4px);
  --ec-scale-attribution-stack-gap: 2px;
}

.ec-map-print-preview-map :deep(.ol-control.ol-attribution) {
  left: auto;
  right: var(--ec-scale-line-right);
  bottom: var(--ec-widget-gap);
  background-color: transparent;
  max-width: none;
  pointer-events: none !important;
}

.ec-map-print-preview-map :deep(.ol-attribution ul) {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.125rem;
  margin: 0;
  padding: 0;
  font-size: 0.28125rem;
  line-height: 1.1;
}

.ec-map-print-preview-map :deep(.ol-attribution img.map-logo-ign-svg),
.ec-map-print-preview-map :deep(.ol-attribution img.map-logo-marianne-svg),
.ec-map-print-preview-map :deep(.ol-attribution img.map-logo-ministere-svg) {
  display: block;
  width: var(--ec-attribution-logo-width);
  height: var(--ec-attribution-logo-height);
  object-fit: contain;
  box-sizing: border-box;
  margin: 0;
  max-height: none;
  background-color: #fff !important;
  padding: 2px;
}

.ec-map-print-preview-map :deep(.ol-attribution a::after),
.ec-map-print-preview-map :deep(.ol-attribution span::after) {
  content: none !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

.ec-map-print-preview-map :deep(.ol-control.ol-scale-line) {
  left: auto;
  right: var(--ec-scale-line-right);
  bottom: calc(
    var(--ec-widget-gap) + var(--ec-attribution-block-height) +
      var(--ec-scale-attribution-stack-gap)
  );
  pointer-events: none !important;
  background: var(--background-default-grey, #fff);
}
</style>

<!-- Modale téléportée : couverture viewport complète -->
<style>
body > dialog.fr-modal:has(.print-page) {
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: none;
  overflow: hidden;
}

body > dialog.fr-modal:has(.print-page) .fr-container,
body > dialog.fr-modal:has(.print-page) .fr-container--fluid,
body > dialog.fr-modal:has(.print-page) .fr-container-md {
  width: 100%;
  max-width: none;
  min-height: 100%;
  margin: 0;
  padding-left: 0;
  padding-right: 0;
}

body > dialog.fr-modal:has(.print-page) .fr-grid-row--center {
  min-height: 100%;
  margin: 0;
}

body > dialog.fr-modal:has(.print-page) .fr-col-12 {
  max-width: none;
  padding: 0;
}

body > dialog.fr-modal:has(.print-page) .fr-modal__body {
  max-height: calc(100dvh - 4rem);
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

body > dialog.fr-modal:has(.print-page) .fr-modal__content {
  overflow-x: hidden;
  overflow-y: visible;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
