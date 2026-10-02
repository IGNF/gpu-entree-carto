import { computed, ref, watch, type Ref } from 'vue'
import {
  nearestSheetSnapIndex,
  snapPercentForIndex,
  TAB_PANELS_DEFAULT_OPEN_SNAP,
  TAB_PANELS_SHEET_SNAP_PERCENT,
  type TabPanelsSheetSnapIndex,
} from '@/lib/map/tabPanelsLayout'
import type { TabPanelsLayoutMode } from '@/lib/map/tabPanelsLayout'

export function useTabPanelsMobileSheet(
  layoutMode: Ref<TabPanelsLayoutMode>,
  mapShellRef: Ref<HTMLElement | null>,
) {
  const sheetSnapIndex = ref<TabPanelsSheetSnapIndex>(0)
  /** Pendant un drag : fraction 0–100 avant snap. */
  const sheetDragPercent = ref<number | null>(null)

  let dragStartY = 0
  let dragStartPercent = 0
  let dragMaxUsablePx = 1

  const sheetFractionPercent = computed(() => {
    if (sheetDragPercent.value !== null) return sheetDragPercent.value
    return snapPercentForIndex(sheetSnapIndex.value)
  })

  function setSheetSnap(index: TabPanelsSheetSnapIndex): void {
    sheetSnapIndex.value = index
    sheetDragPercent.value = null
    syncSheetCssVars(index === 0 ? 0 : snapPercentForIndex(index))
  }

  function syncSheetCssVars(fractionPercent: number): void {
    const shell = mapShellRef.value?.closest('.ec-map-shell')
    if (!(shell instanceof HTMLElement)) return
    const maxEl = mapShellRef.value
    const maxRect = maxEl?.getBoundingClientRect() ?? shell.getBoundingClientRect()
    const occupiedPx = (maxRect.height * fractionPercent) / 100
    shell.style.setProperty('--ec-tab-panels-sheet-fraction', String(fractionPercent))
    shell.style.setProperty('--ec-tab-panels-sheet-occupied-height', `${Math.ceil(occupiedPx)}px`)
  }

  function usableSheetHeightPx(): number {
    const shell = mapShellRef.value?.closest('.ec-map-shell')
    const el = mapShellRef.value ?? shell
    if (!(el instanceof HTMLElement)) return 1
    const styles = getComputedStyle(shell ?? el)
    const chrome = parseFloat(styles.getPropertyValue('--ec-tab-panels-bottom-chrome')) || 56
    const rect = el.getBoundingClientRect()
    const safeTop =
      parseFloat(styles.getPropertyValue('--ec-tab-panels-safe-top')) ||
      parseFloat(styles.getPropertyValue('padding-top')) ||
      0
    const headerOff = parseFloat(styles.getPropertyValue('--ec-tab-panels-site-header-offset')) || 0
    return Math.max(1, rect.height - chrome - safeTop - headerOff)
  }

  function onSheetGrabPointerDown(ev: PointerEvent): void {
    if (layoutMode.value !== 'bottom') return
    const handle = ev.currentTarget
    if (!(handle instanceof HTMLElement)) return
    handle.setPointerCapture(ev.pointerId)
    dragStartY = ev.clientY
    dragStartPercent = sheetFractionPercent.value
    dragMaxUsablePx = usableSheetHeightPx()
    sheetDragPercent.value = dragStartPercent
  }

  function onSheetGrabPointerMove(ev: PointerEvent): void {
    if (layoutMode.value !== 'bottom') return
    if (sheetDragPercent.value === null) return
    if (!(ev.currentTarget instanceof HTMLElement)) return
    if (!ev.currentTarget.hasPointerCapture(ev.pointerId)) return
    const deltaY = dragStartY - ev.clientY
    const deltaPercent = (deltaY / dragMaxUsablePx) * 100
    const next = Math.min(
      TAB_PANELS_SHEET_SNAP_PERCENT[3],
      Math.max(0, dragStartPercent + deltaPercent),
    )
    sheetDragPercent.value = next
    syncSheetCssVars(next)
  }

  function releaseSheetGrabPointer(handle: HTMLElement, pointerId: number): void {
    try {
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
    } catch {
      /* redimensionnement / changement de layout pendant le drag */
    }
  }

  function onSheetGrabPointerUp(ev: PointerEvent): void {
    if (layoutMode.value !== 'bottom') return
    const handle = ev.currentTarget
    if (!(handle instanceof HTMLElement)) return
    releaseSheetGrabPointer(handle, ev.pointerId)
    if (sheetDragPercent.value === null) return
    const fraction = sheetDragPercent.value
    sheetDragPercent.value = null
    setSheetSnap(nearestSheetSnapIndex(fraction))
  }

  watch(layoutMode, (mode) => {
    if (mode !== 'bottom') sheetDragPercent.value = null
  })

  function openSheetDefault(): TabPanelsSheetSnapIndex {
    const next = sheetSnapIndex.value > 0 ? sheetSnapIndex.value : TAB_PANELS_DEFAULT_OPEN_SNAP
    setSheetSnap(next)
    return next
  }

  function closeSheet(): void {
    setSheetSnap(0)
  }

  return {
    sheetSnapIndex,
    sheetDragPercent,
    sheetFractionPercent,
    setSheetSnap,
    openSheetDefault,
    closeSheet,
    syncSheetCssVars,
    onSheetGrabPointerDown,
    onSheetGrabPointerMove,
    onSheetGrabPointerUp,
  }
}
