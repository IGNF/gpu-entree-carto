import { nextTick, onUnmounted, watch, type Ref } from 'vue'
import type { TabPanelsLayoutMode } from '@/lib/map/tabPanelsLayout'

type SavedNode = {
  parent: HTMLElement
  next: ChildNode | null
}

/**
 * En mobile : racine croquis + widgets geopf minimap / territoires entiers dans la barre basse
 * (ne pas détacher le seul bouton — casse PanelManager geopf).
 */
export function useMobileBottomBarGeopf(
  layoutMode: Ref<TabPanelsLayoutMode>,
  sketchSlot: Ref<HTMLElement | null>,
  overviewSlot: Ref<HTMLElement | null>,
  territoriesSlot: Ref<HTMLElement | null>,
) {
  let sketchSaved: SavedNode | null = null
  let territoriesSaved: SavedNode | null = null
  let overviewSaved: SavedNode | null = null
  let observer: MutationObserver | null = null

  function querySketchRoot(): HTMLElement | null {
    return document.querySelector('#gpu-map .ec-sketch-control--geopf-slot')
  }

  function queryTerritoriesWidget(): HTMLElement | null {
    const nodes = document.querySelectorAll('#gpu-map .gpf-widget[id^="GPterritories-"]')
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue
      if (node.id.includes('Panel')) continue
      if (node.querySelector('dialog[id^="GPterritoriesPanel"]')) continue
      return node
    }
    return document.querySelector('#gpu-map .gpf-widget[id^="GPterritories-"]:not([id*="Panel"])')
  }

  function queryOverviewWidget(): HTMLElement | null {
    return document.querySelector('#gpu-map .gpf-widget[id^="GPoverviewMap-"]')
  }

  function moveToSlot(
    node: HTMLElement,
    slot: HTMLElement,
    saved: SavedNode | null,
    markClass?: string,
  ): SavedNode | null {
    if (node.parentElement === slot) return saved
    const parent = node.parentElement
    if (!(parent instanceof HTMLElement)) return saved
    const record: SavedNode = saved ?? { parent, next: node.nextSibling }
    slot.appendChild(node)
    if (markClass) node.classList.add(markClass)
    return record
  }

  function restoreNode(node: HTMLElement | null, saved: SavedNode | null, markClass?: string) {
    if (!node || !saved) return
    if (saved.parent === node.parentElement) return
    if (markClass) node.classList.remove(markClass)
    if (saved.next && saved.next.parentNode === saved.parent) {
      saved.parent.insertBefore(node, saved.next)
    } else {
      saved.parent.appendChild(node)
    }
  }

  function restore() {
    restoreNode(querySketchRoot(), sketchSaved, 'ec-tab-panels__geopf-sketch-root')
    restoreNode(queryTerritoriesWidget(), territoriesSaved, 'ec-tab-panels__geopf-widget')
    restoreNode(queryOverviewWidget(), overviewSaved, 'ec-tab-panels__geopf-widget')
    sketchSaved = null
    territoriesSaved = null
    overviewSaved = null
  }

  function apply() {
    if (layoutMode.value !== 'bottom') {
      return
    }
    const sketchSlotEl = sketchSlot.value
    const overviewSlotEl = overviewSlot.value
    const territoriesSlotEl = territoriesSlot.value
    if (!sketchSlotEl || !overviewSlotEl || !territoriesSlotEl) return

    const sketchRoot = querySketchRoot()
    if (sketchRoot) {
      sketchSaved = moveToSlot(
        sketchRoot,
        sketchSlotEl,
        sketchSaved,
        'ec-tab-panels__geopf-sketch-root',
      )
    }

    const overviewWidget = queryOverviewWidget()
    if (overviewWidget) {
      overviewSaved = moveToSlot(
        overviewWidget,
        overviewSlotEl,
        overviewSaved,
        'ec-tab-panels__geopf-widget',
      )
    }

    const territoriesWidget = queryTerritoriesWidget()
    if (territoriesWidget) {
      territoriesSaved = moveToSlot(
        territoriesWidget,
        territoriesSlotEl,
        territoriesSaved,
        'ec-tab-panels__geopf-widget',
      )
    }
  }

  watch(
    layoutMode,
    (mode) => {
      if (mode !== 'bottom') {
        restore()
        return
      }
      void nextTick(apply)
    },
    { flush: 'sync' },
  )

  watch([sketchSlot, overviewSlot, territoriesSlot], () => {
    if (layoutMode.value === 'bottom') void nextTick(apply)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    restore()
  })

  function startObserver() {
    const mapRoot = document.getElementById('gpu-map')
    if (!mapRoot) return
    observer?.disconnect()
    observer = new MutationObserver(() => {
      if (layoutMode.value === 'bottom') apply()
    })
    observer.observe(mapRoot, { childList: true, subtree: true })
    if (layoutMode.value === 'bottom') apply()
  }

  return { refreshMobileBottomBarGeopf: apply, startMobileBottomBarGeopfObserver: startObserver }
}
