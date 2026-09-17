<script setup lang="ts">
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
</script>

<template>
  <section class="ec-layer-legends" aria-labelledby="ec-layer-legends-title">
    <h2 id="ec-layer-legends-title" class="ec-layer-legends__title">
      <span class="ri-list-indefinite ec-layer-legends__title-icon" aria-hidden="true" />
      Légendes
    </h2>

    <p v-if="!displayLayers.length" class="ec-layer-legends__hint">
      Ajoutez et affichez des couches depuis le catalogue pour voir leurs légendes ici.
    </p>

    <div v-else class="fr-accordions-group">
      <section
        v-for="layer in displayLayers"
        :id="sectionDomId(layer.id)"
        :key="layer.id"
        class="fr-accordion"
        :class="{ 'ec-not-in-zoom-range': !layerInZoomRange(layer) }"
      >
        <h3 class="fr-accordion__title">
          <button
            type="button"
            class="fr-accordion__btn"
            :aria-expanded="isExpanded(layer.id)"
            :aria-controls="collapseDomId(layer.id)"
            @click="toggleExpanded(layer.id)"
          >
            {{ layer.title }}
          </button>
        </h3>
        <div
          :id="collapseDomId(layer.id)"
          class="fr-collapse"
          :class="{ 'fr-collapse--expanded': isExpanded(layer.id) }"
        >
          <div class="ec-layer-legends__collapse-inner">
            <ul v-if="layer.legend?.length" class="ec-layer-legends__list">
              <li v-for="leg in layer.legend" :key="leg.id" class="ec-layer-legends__item">
                <span class="ec-layer-legends__symbols" aria-hidden="true">
                  <template v-if="legendImageSrcs(leg).length">
                    <img
                      v-for="(src, imgIdx) in legendImageSrcs(leg)"
                      :key="imgIdx"
                      class="ec-layer-legends__img"
                      :src="src"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </template>
                  <span v-else class="ec-layer-legends__swatch" />
                </span>
                <span>{{ leg.title }}</span>
              </li>
            </ul>
            <p v-else class="ec-layer-legends__hint">Pas de légende pour cette couche.</p>
          </div>
        </div>
      </section>

      <p v-if="!legendItems.length" class="ec-layer-legends__hint">
        Aucune entrée de légende disponible pour les couches affichées.
      </p>
    </div>
  </section>
</template>

<style scoped>
.ec-layer-legends__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.ec-layer-legends__title-icon {
  flex: 0 0 auto;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--text-action-high-blue-france, #000091);
}

.ec-layer-legends__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-layer-legends__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.8125rem;
}

.ec-layer-legends__symbols {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.2rem;
}

.ec-layer-legends__swatch {
  flex: 0 0 1.25rem;
  width: 1.25rem;
  height: 1rem;
  background: var(--background-action-high-blue-france, #000091);
  border-radius: 2px;
  opacity: 0.55;
}

.ec-layer-legends__img {
  max-width: 8rem;
  height: auto;
}

.ec-layer-legends__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}
</style>
