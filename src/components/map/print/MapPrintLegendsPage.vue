<script setup lang="ts">
import { computed } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import { rewriteLocalGpuSiteUrl } from '@/lib/demo/gpuDevProxy'
import {
  dedupeLegendLayersForPanel,
  resolveLegendItemImageUrls,
} from '@/lib/layerConfig/gpuLegendItems'
import type { LegendItem } from '@/types/stubs'
import '@/styles/layer-legends.css'
import '@/styles/map-print-supplement.css'

const props = defineProps<{
  layers: ManagedLayer[]
  mapZoom: number
  catalogEntryInZoomRange: (id: string, zoom: number) => boolean
}>()

const displayLayers = computed(() => dedupeLegendLayersForPanel(props.layers))

function legendImageSrcs(leg: LegendItem): string[] {
  return resolveLegendItemImageUrls(leg, props.mapZoom).map((url) => rewriteLocalGpuSiteUrl(url))
}

function layerInZoomRange(layer: ManagedLayer): boolean {
  return props.catalogEntryInZoomRange(layer.id, props.mapZoom)
}
</script>

<template>
  <section
    class="ec-print-supplement-page ec-print-legends"
    aria-labelledby="ec-print-legends-title"
  >
    <h2 id="ec-print-legends-title" class="ec-print-legends__title">Légendes</h2>

    <p v-if="!displayLayers.length" class="ec-layer-legends__hint">
      Aucune couche avec légende dans la pile.
    </p>

    <div v-else class="ec-print-legends__groups">
      <section
        v-for="layer in displayLayers"
        :key="layer.id"
        class="ec-print-legends__group"
        :class="{ 'ec-not-in-zoom-range': !layerInZoomRange(layer) }"
      >
        <h3 class="ec-print-legends__group-title">{{ layer.title }}</h3>
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
                  crossorigin="anonymous"
                />
              </template>
              <span v-else class="ec-layer-legends__swatch" />
            </span>
            <span>{{ leg.title }}</span>
          </li>
        </ul>
        <p v-else class="ec-layer-legends__hint">Pas de légende pour cette couche.</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.ec-layer-legends__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ec-layer-legends__item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ec-layer-legends__symbols {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.1rem;
}

.ec-layer-legends__hint {
  margin: 0;
  color: var(--text-mention-grey, #666);
}
</style>
