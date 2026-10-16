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
  countSupplementPageSlices,
  printSupplementCssVars,
  waitForPrintSupplementImages,
} from '@/lib/map/print/printSupplementLayout'
import {
  buildParcelDocumentsPrintHtml,
  buildParcelInfosPrintHtml,
  isParcelFichePrintReady,
  isTerritoryFichePrintReady,
  parcelPrintTitle,
  territoryPrintTitle,
} from '@/lib/map/print/printFicheSnapshot'
import { dedupeLegendLayersForPanel } from '@/lib/layerConfig/gpuLegendItems'
import { mapPrintPanelsRef } from '@/map/mapPrintPanelsContext'
import { sanitizePrintPreviewAttributions } from '@/lib/map/print/sanitizePrintAttributions'
import { drawAttributionOnMapExport } from '@/lib/map/print/drawPrintAttribution'
import MapPrintFicheTerritoryPage from '@/components/map/print/MapPrintFicheTerritoryPage.vue'
import MapPrintFicheParcelPage from '@/components/map/print/MapPrintFicheParcelPage.vue'
import MapPrintLegendsPage from '@/components/map/print/MapPrintLegendsPage.vue'
import type { FicheInfoSelection } from '@/composables/tabPanels'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import {
  resolvePrintFicheSelections,
  type PrintFicheSelections,
} from '@/lib/map/print/resolvePrintFicheSelections'

const title = 'Imprimer une carte'
const size = 'xl'

const printModalOpened = ref(false)
const isExportInProgress = ref(false)
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
const previewPageIndex = ref(0)
const mapTitle = ref<HTMLElement | null>(null)
const printPage = ref<HTMLElement | null>(null)
const printForm = ref<HTMLElement | null>(null)
const previewPaginationEl = ref<HTMLElement | null>(null)

const previewMap = shallowRef<Map | null>(null)

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
  margin: 5,
  paperFormat: 'A4',
  dpi: BASE_DPI,
  format: 'PNG',
})

const panelSelection = computed(() => printPanels.value?.selection.value ?? null)
const panelLegendLayers = computed(() => printPanels.value?.legendLayers.value ?? [])
const panelMapZoom = computed(() => printPanels.value?.mapZoom.value ?? 6)

const printFicheSelections = ref<PrintFicheSelections | null>(null)
let printFicheLoadGeneration = 0

function mergeFicheSelectionForPrint(
  mode: typeof MAP_MODE_PARCEL,
  resolved: FicheInfoSelection | null | undefined,
  panel: FicheInfoSelection | null,
  isReady: (selection: FicheInfoSelection | null) => boolean,
): FicheInfoSelection | null {
  if (resolved && isReady(resolved)) return resolved
  if (panel?.mapMode === mode && isReady(panel)) return panel
  return resolved ?? (panel?.mapMode === mode ? panel : null)
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
  buildParcelInfosPrintHtml(parcelSelectionForPrint.value, panelMapZoom.value),
)
const parcelDocumentsHtml = computed(() =>
  buildParcelDocumentsPrintHtml(parcelSelectionForPrint.value),
)

async function refreshPrintFicheSelections(): Promise<void> {
  const generation = ++printFicheLoadGeneration
  const result = await resolvePrintFicheSelections(panelMapZoom.value, {
    territory: true,
    parcel: true,
  })
  if (generation !== printFicheLoadGeneration) return
  printFicheSelections.value = result
  await remeasureSupplementPageCounts()
}

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
      canPrintTerritoryFiche.value,
      canPrintParcelFiche.value,
      canPrintLegends.value,
    ] as const,
  () => {
    previewPageIndex.value = 0
    void remeasureSupplementPageCounts()
  },
)

function goPreviewPage(delta: number): void {
  const count = previewPages.value.length
  if (count <= 1) return
  previewPageIndex.value = (previewPageIndex.value + delta + count) % count
}

const supplementExportInner = computed(() =>
  computePrintSupplementInnerPx(
    paperDimension.value.width,
    paperDimension.value.height,
    printFormState.margin,
    printFormState.dpi,
  ),
)

const supplementLayoutStyle = computed(() =>
  printSupplementCssVars(supplementExportInner.value.innerWidthPx),
)

const supplementPreviewScale = computed(() => {
  const { innerWidthPx } = supplementExportInner.value
  const previewW = previewPrintableSizePx.value.width
  if (!innerWidthPx || !previewW) return 1
  return previewW / innerWidthPx
})

const supplementPreviewScalerStyle = computed(() => ({
  ...supplementLayoutStyle.value,
  transform: `scale(${supplementPreviewScale.value})`,
}))

const supplementContentOffsetStyle = computed(() => {
  const page = currentPreviewPage.value
  if (!page || page.kind === 'map') return {}
  const { innerHeightPx } = supplementExportInner.value
  if (!innerHeightPx) return {}
  return { marginTop: `-${page.sliceIndex * innerHeightPx}px` }
})

async function remeasureSupplementPageCounts(): Promise<void> {
  if (!printModalOpened.value) return
  const { innerWidthPx, innerHeightPx } = supplementExportInner.value
  if (innerWidthPx < 8 || innerHeightPx < 8) return

  const kinds: PrintPreviewPageKind[] = []
  if (printFormState.hasTerritoryFiche && canPrintTerritoryFiche.value) {
    kinds.push('ficheTerritory')
  }
  if (printFormState.hasParcelFiche && canPrintParcelFiche.value) {
    kinds.push('ficheParcel')
  }
  if (printFormState.hasLegends && canPrintLegends.value) {
    kinds.push('legends')
  }

  if (!kinds.length) {
    supplementSliceCounts.value = {}
    return
  }

  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready.catch(() => undefined)
  }

  const next: Partial<Record<PrintPreviewPageKind, number>> = {
    ...supplementSliceCounts.value,
  }
  for (const kind of kinds) {
    measureKind.value = kind
    await nextTick()
    await nextTick()
    const measureRoot = supplementMeasureInnerRef.value
    if (measureRoot) {
      await waitForPrintSupplementImages(measureRoot)
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    next[kind] = measureRoot ? countSupplementPageSlices(measureRoot, innerHeightPx) : 1
  }
  measureKind.value = null
  supplementSliceCounts.value = next
}

const catalogEntryInZoomRangeForPrint = (layerId: string, zoom: number): boolean =>
  printPanels.value?.catalogEntryInZoomRange(layerId, zoom) ?? true

const previewMapHostSize = reactive(
  useElementSize(previewMapEl, { width: 0, height: 0 }, { box: 'border-box' }),
)

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

const paperDimension = computed(() => {
  const fmt = PAPER_FORMATS_MM[printFormState.paperFormat]
  if (printFormState.pageOrientation === 'landscape') {
    return { width: fmt.height, height: fmt.width }
  }
  return fmt
})

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

/** Espace réservé sous l’aperçu feuille pour la barre de pagination. */
const previewPaginationReservePx = computed(() => {
  if (previewPages.value.length <= 1) return 0
  const measured = previewPaginationSize.height
  const barHeight = measured > 4 ? measured : 48
  return barHeight + 8
})

const paperDimensionPx = computed(() => ({
  width: paperDimension.value.width / COEFF_PX2MM,
  height: paperDimension.value.height / COEFF_PX2MM,
}))

const paper2PreviewScaleCoeff = computed(() => {
  const containerHeight = Math.max(0, printPageSize.height - previewPaginationReservePx.value)
  const containerWidth = printPageSize.width - printFormSize.width
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

const titleHeightRatioInPreview = computed(() => {
  if (!printFormState.hasTitle || previewDimensionPx.value.height <= 0) return 0
  const ratio = titleSize.height / previewDimensionPx.value.height
  return Math.max(0, Math.min(1, ratio))
})

const titleHeightMm = computed(() => printableAreaMm.value.height * titleHeightRatioInPreview.value)

const previewDimensionPx = computed(() => ({
  width: paperDimensionPx.value.width * paper2PreviewScaleCoeff.value,
  height: paperDimensionPx.value.height * paper2PreviewScaleCoeff.value,
}))

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

watchDebounced(
  () =>
    [
      previewPrintableSizePx.value.width,
      previewPrintableSizePx.value.height,
      printFormState.paperFormat,
      printFormState.pageOrientation,
      printFormState.margin,
      paper2PreviewScaleCoeff.value,
      printFormState.dpi,
      supplementExportInner.value.innerWidthPx,
      territoryDocumentTabs.value.length,
      parcelInfosHtml.value.length,
      parcelDocumentsHtml.value.length,
      panelLegendLayers.value.length,
    ] as const,
  () => {
    void remeasureSupplementPageCounts()
  },
  { debounce: 120, maxWait: 400 },
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
  if (!source || !target) return null

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
  return map
}

watch(printModalOpened, async (isOpen) => {
  if (!isOpen) {
    printFicheLoadGeneration += 1
    printFicheSelections.value = null
    destroyPreviewMap()
    return
  }
  await nextTick()
  syncNativePrintDialog()
  await ensurePreviewMap(true)
  syncNativePrintDialog()
  void refreshPrintFicheSelections()
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
    const sliceCount = supplementSliceCounts.value[kind] ?? 1
    measureKind.value = kind
    await nextTick()
    const measureRoot = supplementMeasureInnerRef.value
    if (measureRoot) {
      await waitForPrintSupplementImages(measureRoot)
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const pageEl = measureRoot?.querySelector('.ec-print-supplement-page') as HTMLElement | null
    if (!pageEl) continue
    byKind[kind] = await rasterizePrintSupplementSlices(
      pageEl,
      sliceCount,
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
              :label="printFormState.hasTitle ? 'Désactiver le titre' : 'Activer le titre'"
            />
          </div>
          <div class="mt-10">
            <DsfrCheckbox
              v-model="printFormState.hasScale"
              :value="true"
              name="ec-map-print-has-scale"
              :label="printFormState.hasScale ? 'Désactiver l\'échelle' : 'Afficher l\'échelle'"
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
            :disabled="isExportInProgress"
            icon=""
            no-outline
            @click="onClickExportMap"
          />
        </div>
        <div
          class="print-preview-column"
          :class="{ 'print-preview-column--paginated': previewPages.length > 1 }"
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
                <div v-if="printFormState.hasTitle" id="map-title" ref="mapTitle" class="map-title">
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
                <div class="print-preview-supplement-viewport">
                  <div class="print-supplement-scaler-clip">
                    <div class="print-supplement-layout-root" :style="supplementPreviewScalerStyle">
                      <div
                        ref="supplementContentRef"
                        class="print-preview-supplement-content"
                        :style="supplementContentOffsetStyle"
                      >
                        <MapPrintFicheTerritoryPage
                          v-if="printModalOpened && currentPreviewPage?.kind === 'ficheTerritory'"
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
                          :map-zoom="panelMapZoom"
                          :catalog-entry-in-zoom-range="catalogEntryInZoomRangeForPrint"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <nav
            v-if="previewPages.length > 1"
            ref="previewPaginationEl"
            class="print-preview-pagination"
            aria-label="Pages à imprimer"
          >
            <button
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
              type="button"
              class="fr-btn fr-btn--tertiary fr-btn--sm"
              aria-label="Page suivante"
              @click="goPreviewPage(1)"
            >
              <span class="fr-icon-arrow-right-s-line" aria-hidden="true" />
            </button>
          </nav>
        </div>
        <div v-if="isExportInProgress" class="print-patience-overlay">Traitement en cours…</div>
      </div>
    </DsfrModal>
    <div ref="supplementMeasureInnerRef" class="print-supplement-measure" aria-hidden="true">
      <div
        class="print-supplement-measure__viewport"
        :style="{
          width: `${supplementExportInner.innerWidthPx}px`,
          height: `${supplementExportInner.innerHeightPx}px`,
        }"
      >
        <div
          class="print-supplement-measure__content"
          :style="{
            ...supplementLayoutStyle,
            width: `${supplementExportInner.innerWidthPx}px`,
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
            :map-zoom="panelMapZoom"
            :catalog-entry-in-zoom-range="catalogEntryInZoomRangeForPrint"
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

.print-preview-column {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  overflow: hidden;
}

.print-preview-column--paginated {
  justify-content: space-between;
}

.print-preview-column--paginated .print-preview-container {
  flex: 1 1 auto;
  min-height: 0;
  align-self: center;
}

.print-preview-container {
  flex: 0 0 auto;
  justify-content: flex-start;
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  box-shadow: 3px 3px 5px 6px #ccc;
  max-height: 100%;
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
}

.print-preview-supplement-viewport {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.print-supplement-scaler-clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.print-preview-supplement-content {
  width: 100%;
  height: auto;
}

.print-supplement-measure {
  position: fixed;
  left: -10000px;
  top: 0;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  overflow: visible;
}

.print-supplement-measure__viewport {
  box-sizing: border-box;
  overflow: hidden;
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
  padding: 0.25rem 0.5rem 0.35rem;
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
