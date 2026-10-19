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
import { jsPDF } from 'jspdf'
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
import { renderMapCanvasForExport } from '@/lib/map/print/mapExport'
import { injectDpiInPng } from '@/lib/map/print/pngDpi'
import { copyViewState } from '@/lib/map/print/syncPrintMapView'
import { waitForMapRender } from '@/lib/map/print/waitForMapRender'
import {
  captureScaleLineSnapshot,
  computeScaleCoeff,
  drawScale,
  drawTitle,
} from '@/lib/map/print/printScale'
import { buildPrintPreviewPages, type PrintPreviewPageKind } from '@/lib/map/print/printPageTypes'
import { rasterizePrintSupplementSlices } from '@/lib/map/print/rasterizePrintSupplementPage'
import {
  computePrintSupplementInnerPx,
  hideSupplementElementsForSlice,
  measureSupplementSlicePlan,
  measureSupplementSlicePlanFromPage,
  printSupplementCssVars,
  resetSupplementElementVisibility,
  resolveSupplementSliceEndPx,
  resolveSupplementSliceStartPx,
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
import { sanitizePrintPreviewAttributions } from '@/lib/map/print/sanitizePrintAttributions'
import { drawAttributionOnMapExport } from '@/lib/map/print/drawPrintAttribution'
import MapPrintFicheTerritoryPage from '@/components/map/print/MapPrintFicheTerritoryPage.vue'
import MapPrintFicheParcelPage from '@/components/map/print/MapPrintFicheParcelPage.vue'
import MapPrintLegendsPage from '@/components/map/print/MapPrintLegendsPage.vue'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import {
  resolvePrintFicheSelections,
  type PrintFicheSelections,
} from '@/lib/map/print/resolvePrintFicheSelections'
import {
  buildSupplementSlicePlanCacheKey,
  supplementContentSuffixForKind,
  type SupplementContentFingerprints,
} from '@/lib/map/print/printSlicePlanCache'
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

function onModalPrintOpen(): void {
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
const mapTitle = ref<HTMLElement | null>(null)
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
  const layers = dedupeLegendLayersForPanel(panelLegendLayers.value)
  return layers.some((layer) => layer.legend?.length)
})

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
    ] as const,
  () => {
    previewPageIndex.value = 0
  },
)

const supplementContentFingerprints = computed((): SupplementContentFingerprints => ({
  territoryTabCount: territoryDocumentTabs.value.length,
  territoryPanelZoom: panelMapZoom.value,
  parcelInfosLength: parcelInfosHtml.value.length,
  parcelDocumentsLength: parcelDocumentsHtml.value.length,
  legendLayerIds: panelLegendLayers.value.map((layer) => layer.id).join(','),
  legendItemCount: panelLegendLayers.value.reduce(
    (count, layer) => count + (layer.legend?.length ?? 0),
    0,
  ),
  legendPreviewZoom: printPreviewLegendZoom.value,
}))

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
  supplementSlicePlanByKey.set(supplementSlicePlanCacheKey(kind), plan)
  supplementSliceCounts.value = { ...supplementSliceCounts.value, [kind]: plan.sliceCount }
  supplementSliceStarts.value = { ...supplementSliceStarts.value, [kind]: [...plan.sliceStarts] }
  logPrintPreview(`mesure aperçu visible: « ${kind} » révisé`, plan)
}

async function remeasureSupplementFromVisiblePreview(): Promise<void> {
  if (!printModalOpened.value || isPreviewLayoutPending.value) return
  const pageMeta = currentPreviewPage.value
  if (!pageMeta || pageMeta.kind === 'map') return

  const pageRoot = findSupplementPreviewPageRoot()
  const innerHeightPx = supplementExportInner.value.innerHeightPx
  if (!pageRoot || innerHeightPx < 8) return

  await waitForPrintSupplementImages(pageRoot, { timeoutMs: 6_000 })
  await waitForSupplementPageHeightStable(pageRoot, { timeoutMs: 4_000 })
  const plan = measureSupplementSlicePlanFromPage(pageRoot, innerHeightPx)
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
        const plan = await measureSlicePlanForKindInDom(kind, layout.inner.innerHeightPx, {
          imageTimeoutMs: 2_500,
        })
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

async function remeasureSupplementPageCounts(): Promise<void> {
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
  if (kindsToMeasure.length > 0) {
    isPreviewLayoutPending.value = true
  }
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
        measureLayoutOverride.value = null
        plan = await measureSlicePlanForKindInDom(kind, innerHeightPx, {
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
    } else {
      logPrintPreview('mesure: fin sans réafficher (modale fermée)')
    }
  }
}

const catalogEntryInZoomRangeForPrint = (layerId: string, zoom: number): boolean =>
  printPanels.value?.catalogEntryInZoomRange(layerId, zoom) ?? true

function catalogEntryInZoomRangeForPrintPreview(layerId: string): boolean {
  return catalogEntryInZoomRangeForPrint(layerId, printPreviewLegendZoom.value)
}

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
const titleSize = reactive(useElementSize(mapTitle, { width: 0, height: 0 }, { box: 'border-box' }))
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

const titleHeightRatioInPreview = computed(() => {
  if (!printFormState.hasTitle || previewDimensionPx.value.height <= 0) return 0
  const ratio = titleSize.height / previewDimensionPx.value.height
  return Math.max(0, Math.min(1, ratio))
})

const titleHeightMm = computed(() => printableAreaMm.value.height * titleHeightRatioInPreview.value)

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
  return {
    width: previewW,
    height: innerHeightPx * scale,
    scale,
    sliceHeightPx: innerHeightPx,
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

function applyCurrentSupplementSliceVisibility(): void {
  const pageRoot = findSupplementPreviewPageRoot()
  if (!pageRoot) return
  resetSupplementElementVisibility(pageRoot)

  const page = currentPreviewPage.value
  if (!page || page.kind === 'map') return

  const sliceHeightPx = supplementExportInner.value.innerHeightPx
  if (sliceHeightPx < 8) return

  const layoutScale = supplementPreviewFrame.value.scale * previewColumnZoom.value
  const sliceStartPx = resolveSupplementSliceStartPx(
    pageRoot,
    page.sliceIndex,
    sliceHeightPx,
    layoutScale,
  )
  const sliceEndPx = resolveSupplementSliceEndPx(pageRoot, sliceStartPx, sliceHeightPx, layoutScale)
  supplementPreviewSliceStartPx.value = sliceStartPx
  hideSupplementElementsForSlice(pageRoot, sliceStartPx, sliceEndPx, layoutScale)
}

watch(
  () =>
    [
      currentPreviewPage.value?.id,
      supplementSliceStarts.value,
      isPreviewLayoutPending.value,
      supplementExportInner.value.innerHeightPx,
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

/** Dépendances de pagination export (hors échelle écran → évite boucle avec la barre de pages). */
const previewLayoutMeasureDeps = computed(
  () =>
    [
      printFormState.paperFormat,
      printFormState.pageOrientation,
      printFormState.margin,
      printFormState.dpi,
      supplementExportInner.value.innerWidthPx,
      supplementExportInner.value.innerHeightPx,
      territoryDocumentTabs.value.length,
      parcelInfosHtml.value.length,
      parcelDocumentsHtml.value.length,
      panelLegendLayers.value.length,
    ] as const,
)

watch(previewLayoutMeasureDeps, () => {
  if (!printModalOpened.value) return
  logPrintPreview('paramètres: changement (debounce mesure)')
})

watchDebounced(
  previewLayoutMeasureDeps,
  () => {
    logPrintPreview('paramètres: relance mesure (debounce)')
    void remeasureSupplementPageCounts()
  },
  { debounce: 120, maxWait: 400 },
)

watchDebounced(
  printPreviewLegendZoom,
  (zoom, previous) => {
    if (!printModalOpened.value || zoom === previous) return
    logPrintPreview('zoom carte aperçu → légendes', { zoom, previous })
    invalidateLegendsSlicePlanCache()
    if (canPrintLegends.value) void remeasureSupplementPageCounts()
  },
  { debounce: 150 },
)

let sourceViewListeners: EventsKey[] = []

function clearSourceViewListeners(): void {
  unByKey(sourceViewListeners)
  sourceViewListeners = []
}

function destroyPreviewMap(): void {
  clearSourceViewListeners()
  previewMap.value?.setTarget(undefined)
  previewMap.value?.dispose()
  previewMap.value = null
}

function syncPreviewFromSource(): void {
  const source = sourceMapRef.value
  const preview = previewMap.value
  if (!source || !preview) return
  copyViewState(source.getView(), preview.getView())
  preview.renderSync()
}

function attachSourceViewListeners(): void {
  clearSourceViewListeners()
  const source = sourceMapRef.value
  if (!source) return
  const view = source.getView()
  const handler = () => syncPreviewFromSource()
  sourceViewListeners = [
    view.on('change:center', handler),
    view.on('change:resolution', handler),
    view.on('change:rotation', handler),
  ]
}

function createPreviewControls(): (Attribution | ScaleLine)[] {
  const controls: (Attribution | ScaleLine)[] = [new Attribution({ collapsible: false })]
  if (printFormState.hasScale) {
    controls.push(
      new ScaleLine({
        units: 'metric',
        minWidth: 100,
        bar: false,
      }),
    )
  }
  return controls
}

function wirePreviewMapDisplayControls(map: Map): void {
  configureDisplayOnlyOlControls(map)
  map.getControls().on('add', () => configureDisplayOnlyOlControls(map))
}

async function ensurePreviewMap(forceRecreate = false): Promise<Map | null> {
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
    rebuildPrintPreviewMap(source, previewMap.value)
    previewMap.value.updateSize()
    previewMap.value.renderSync()
    await waitForMapRender(previewMap.value, 2)
    sanitizePrintPreviewAttributions(previewMapEl.value)
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
  rebuildPrintPreviewMap(source, map)
  previewMap.value = map
  wirePreviewMapDisplayControls(map)
  attachSourceViewListeners()
  await nextTick()
  map.updateSize()
  await waitForMapRender(map, 2)
  sanitizePrintPreviewAttributions(previewMapEl.value)
  logPrintPreview('carte aperçu: prête')
  return map
}

watch(printModalOpened, async (isOpen) => {
  if (!isOpen) {
    printFicheLoadGeneration += 1
    printFicheSelections.value = null
    supplementSlicePlanByKey.clear()
    supplementSliceCounts.value = {}
    supplementSliceStarts.value = {}
    destroyPreviewMap()
    isPreviewLayoutPending.value = false
    logPrintPreview('modale fermée')
    return
  }
  supplementSlicePlanByKey.clear()
  supplementSliceCounts.value = {}
  supplementSliceStarts.value = {}
  isPreviewLayoutPending.value = true
  logPrintPreview('modale ouverte: patience')
  try {
    syncPrintFicheSelectionsFromCache()
    await nextTick()
    syncNativePrintDialog()
    await ensurePreviewMap(true)
    syncNativePrintDialog()
    await refreshPrintFicheSelections()
  } catch (err) {
    logPrintPreview('modale ouverte: erreur', err)
    isPreviewLayoutPending.value = false
  }
})

watch(
  () => [printFormState.hasScale, printFormState.hasTitle, printFormState.margin] as const,
  () => {
    if (!printModalOpened.value) return
    void nextTick().then(() => ensurePreviewMap(true))
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

async function buildRasterExportCanvas(): Promise<{
  dpiValue: number
  finalCanvas: HTMLCanvasElement
}> {
  const restorePreviewIndex = await ensureMapPreviewPageVisibleForExport()
  const dpiValue = printFormState.dpi
  const dpiCoeff = dpiValue / BASE_DPI
  const paperWidthPx = convertMmToPx(paperDimension.value.width, dpiValue)
  const paperHeightPx = convertMmToPx(paperDimension.value.height, dpiValue)
  const marginPx = convertMmToPx(printFormState.margin, dpiValue)
  const titleHeightPx = printFormState.hasTitle
    ? Math.round((titleHeightMm.value / paperDimension.value.height) * paperHeightPx)
    : 0
  const mapWidthPx = Math.max(0, paperWidthPx - marginPx * 2)
  const mapHeightPx = Math.max(0, paperHeightPx - marginPx * 2 - titleHeightPx)

  const mapElement = previewMapEl.value
  const scaleSnapshot =
    printFormState.hasScale && dpiValue === HIGH_DPI_VALUE && mapElement
      ? captureScaleLineSnapshot(mapElement, paper2PreviewScaleCoeff.value)
      : null

  const map = getPrintMapInstance()
  if (!map) throw new Error('Carte indisponible pour l’export.')
  syncPreviewFromSource()
  await waitForMapRender(map, 2)
  sanitizePrintPreviewAttributions(previewMapEl.value)
  const mapCanvas = await renderMapCanvasForExport(map, mapWidthPx, mapHeightPx)

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

  if (printFormState.hasTitle && mapTitle.value) {
    const titleCanvas = document.createElement('canvas')
    titleCanvas.width = mapWidthPx
    titleCanvas.height = titleHeightPx
    const titleCtx = titleCanvas.getContext('2d')
    if (titleCtx) {
      drawTitle(
        titleCtx,
        titleHeightPx,
        mapWidthPx,
        printFormState.printTitle,
        mapTitle.value,
        dpiCoeff,
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

  return { dpiValue, finalCanvas }
}

async function buildSupplementExportCanvasesByKind(): Promise<
  Partial<Record<PrintPreviewPageKind, HTMLCanvasElement[]>>
> {
  const byKind: Partial<Record<PrintPreviewPageKind, HTMLCanvasElement[]>> = {}
  const sections: { kind: PrintPreviewPageKind; enabled: boolean }[] = [
    {
      kind: 'ficheTerritory',
      enabled: printFormState.hasTerritoryFiche && canPrintTerritoryFiche.value,
    },
    {
      kind: 'ficheParcel',
      enabled: printFormState.hasParcelFiche && canPrintParcelFiche.value,
    },
    { kind: 'legends', enabled: printFormState.hasLegends && canPrintLegends.value },
  ]

  for (const { kind, enabled } of sections) {
    if (!enabled) continue
    const sliceStarts = supplementSliceStarts.value[kind] ?? [0]
    measureKind.value = kind
    await nextTick()
    const measureRoot = supplementMeasureInnerRef.value
    if (measureRoot) {
      await waitForPrintSupplementImages(measureRoot, { timeoutMs: 8_000 })
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const pageEl = measureRoot?.querySelector('.ec-print-supplement-page') as HTMLElement | null
    if (!pageEl) continue
    byKind[kind] = await rasterizePrintSupplementSlices(
      pageEl,
      sliceStarts,
      paperDimension.value.width,
      paperDimension.value.height,
      printFormState.margin,
      printFormState.dpi,
    )
  }
  measureKind.value = null
  return byKind
}

async function captureAllExportCanvases(): Promise<HTMLCanvasElement[]> {
  const savedIndex = previewPageIndex.value
  const canvases: HTMLCanvasElement[] = []
  let mapCanvas: HTMLCanvasElement | null = null
  try {
    const supplementByKind = await buildSupplementExportCanvasesByKind()
    for (const page of previewPages.value) {
      if (page.kind === 'map') {
        if (!mapCanvas) {
          const { finalCanvas } = await buildRasterExportCanvas()
          mapCanvas = finalCanvas
        }
        canvases.push(mapCanvas)
        continue
      }
      const slice = supplementByKind[page.kind]?.[page.sliceIndex]
      if (slice) canvases.push(slice)
    }
  } finally {
    previewPageIndex.value = savedIndex
    await nextTick()
  }
  return canvases
}

async function exportRasterCanvases(canvases: HTMLCanvasElement[]): Promise<void> {
  const dpiValue = printFormState.dpi
  const ext = printFormState.format === 'JPEG' ? 'jpeg' : 'png'
  for (let i = 0; i < canvases.length; i += 1) {
    const canvas = canvases[i]
    const suffix = canvases.length > 1 ? ` - page ${i + 1}` : ''
    const fileName = `carte${suffix}.${ext}`
    if (printFormState.format === 'PNG') {
      const finalUrl = await injectDpiInPng(canvas.toDataURL('image/png'), dpiValue)
      triggerDownload(fileName, finalUrl)
    } else {
      triggerDownload(fileName, canvas.toDataURL('image/jpeg', 0.95))
    }
    canvas.remove()
  }
}

function exportPdfFromCanvases(pages: HTMLCanvasElement[]): void {
  const doc = new jsPDF({
    orientation: printFormState.pageOrientation,
    unit: 'mm',
    format: [paperDimension.value.width, paperDimension.value.height],
  })
  for (let i = 0; i < pages.length; i += 1) {
    if (i > 0) {
      doc.addPage(
        [paperDimension.value.width, paperDimension.value.height],
        printFormState.pageOrientation,
      )
    }
    doc.addImage(
      pages[i].toDataURL('image/png'),
      'PNG',
      0,
      0,
      paperDimension.value.width,
      paperDimension.value.height,
    )
  }
  doc.save(pages.length > 1 ? 'carte-et-annexes.pdf' : 'carte.pdf')
  for (const canvas of pages) canvas.remove()
}

async function onClickExportMap(): Promise<void> {
  if (isExportInProgress.value) return
  isExportInProgress.value = true
  try {
    const canvases =
      previewPages.value.length > 1
        ? await captureAllExportCanvases()
        : [(await buildRasterExportCanvas()).finalCanvas]
    if (!canvases.length) return
    if (printFormState.format === 'PDF') {
      exportPdfFromCanvases(canvases)
      return
    }
    await exportRasterCanvases(canvases)
  } finally {
    isExportInProgress.value = false
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
            label="Titre de la carte"
            label-visible
            name="titre"
            class="mb-10"
          />
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasTitle"
              :value="true"
              name="ec-map-print-has-title"
              label="Activer le titre"
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
            id="print-page-export"
            :label="isExportInProgress ? 'Traitement en cours...' : 'Imprimer la carte'"
            :title="isExportInProgress ? 'Traitement en cours...' : 'Imprimer la carte'"
            :disabled="isExportInProgress || isPreviewLayoutPending"
            icon=""
            no-outline
            @click="onClickExportMap"
          />
        </div>
        <div class="print-preview-panel">
          <nav
            v-show="!isPreviewLayoutPending"
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
              v-show="isPreviewLayoutPending"
              class="print-preview-patience"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              Préparation de l’aperçu…
            </div>
            <div
              v-show="!isPreviewLayoutPending"
              class="print-preview-column__scale-slot"
              :style="previewColumnScaleSlotStyle"
            >
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
                        ref="mapTitle"
                        class="map-title"
                      >
                        {{ printFormState.printTitle }}
                      </div>
                      <div
                        v-if="printModalOpened"
                        ref="previewMapEl"
                        class="map ec-map-print-preview-map"
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
                              v-if="printModalOpened && currentPreviewPage?.kind === 'ficheParcel'"
                              :title="parcelPrintTitle(parcelSelectionForPrint)"
                              :infos-html="parcelInfosHtml"
                              :documents-html="parcelDocumentsHtml"
                              :cadastre-references="parcelCadastreReferences"
                            />
                            <MapPrintLegendsPage
                              v-if="printModalOpened && currentPreviewPage?.kind === 'legends'"
                              :layers="panelLegendLayers"
                              :map-zoom="printPreviewLegendZoom"
                              :catalog-entry-in-zoom-range="catalogEntryInZoomRangeForPrintPreview"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="isExportInProgress" class="print-patience-overlay">Traitement en cours…</div>
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
            :layers="panelLegendLayers"
            :map-zoom="printPreviewLegendZoom"
            :catalog-entry-in-zoom-range="catalogEntryInZoomRangeForPrintPreview"
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

.print-page {
  display: flex;
  flex-direction: row;
  height: min(35rem, calc(100dvh - 6rem));
  max-height: calc(100dvh - 6rem);
  min-height: 0;
  position: relative;
}

.print-patience-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  z-index: 2;
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
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 12rem;
  padding: 1.5rem 1rem;
  box-sizing: border-box;
  color: var(--text-mention-grey, #666);
  font-size: 0.875rem;
  text-align: center;
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

.map-title {
  flex: 0 0 auto;
  text-align: center;
  font-size: var(--print-map-title-font, 0.875rem);
  line-height: 1.25;
  margin-bottom: 0.25rem;
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

body > dialog.fr-modal:has(.print-page) .fr-modal__content {
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
