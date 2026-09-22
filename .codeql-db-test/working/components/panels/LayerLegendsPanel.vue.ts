/**
 * Onglet Légendes — une section DSFR `fr-accordion` par couche (repliée par défaut).
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import { legendPanelFocusRef } from '@/composables/tabPanels'
import { rewriteLocalGpuSiteUrl } from '@/lib/demo/gpuDevProxy'
import {
  dedupeLegendLayersForPanel,
  resolveLegendItemImageUrls,
} from '@/lib/layerConfig/gpuLegendItems'
import type { LegendItem } from '@/types/stubs'
/* Accordéon : absent de dsfr.min.css (comme navigation pour le catalogue). */
import '@gouvfr/dsfr/dist/component/accordion/accordion.min.css'
import '@/styles/layer-legends.css'

const props = defineProps<{
  layers: ManagedLayer[]
  mapZoom: number
  catalogEntryInZoomRange: (id: string, zoom: number) => boolean
}>()

const expandedByLayerId = ref<Record<string, boolean>>({})

function layerInZoomRange(layer: ManagedLayer): boolean {
  return props.catalogEntryInZoomRange(layer.id, props.mapZoom)
}

function collapseDomId(layerId: string): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `ec-legend-collapse-${safe}`
}

function sectionDomId(layerId: string): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `ec-legend-section-${safe}`
}

function isExpanded(layerId: string): boolean {
  return Boolean(expandedByLayerId.value[layerId])
}

function toggleExpanded(layerId: string) {
  expandedByLayerId.value = {
    ...expandedByLayerId.value,
    [layerId]: !expandedByLayerId.value[layerId],
  }
}

function legendImageSrcs(leg: LegendItem): string[] {
  return resolveLegendItemImageUrls(leg, props.mapZoom).map((url) => rewriteLocalGpuSiteUrl(url))
}

const displayLayers = computed(() => dedupeLegendLayersForPanel(props.layers))

const legendItems = computed((): LegendItem[] => {
  const items: LegendItem[] = []
  for (const layer of displayLayers.value) {
    if (layer.legend?.length) items.push(...layer.legend)
  }
  return items
})

async function focusLegendLayer(layerId: string) {
  expandedByLayerId.value = {
    ...expandedByLayerId.value,
    [layerId]: true,
  }
  await nextTick()
  requestAnimationFrame(() => {
    const el = document.getElementById(sectionDomId(layerId))
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}

watch(
  legendPanelFocusRef,
  (focus) => {
    if (!focus?.layerId) return
    if (!props.layers.some((l) => l.id === focus.layerId)) return
    void focusLegendLayer(focus.layerId)
  },
  { flush: 'post' },
)

watch(
  () => props.layers.map((l) => l.id).join('|'),
  (sig, prev) => {
    if (sig === prev) return
    const ids = new Set(props.layers.map((l) => l.id))
    const next: Record<string, boolean> = {}
    for (const [id, open] of Object.entries(expandedByLayerId.value)) {
      if (ids.has(id) && open) next[id] = true
    }
    expandedByLayerId.value = next
  },
)
