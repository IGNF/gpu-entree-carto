<script setup lang="ts">
import { computed, ref } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import FullScreenControl from '@/components/map/FullScreenControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import SearchEngineControl from '@/components/map/SearchEngineControl.vue'
import OverviewMapControl from '@/components/map/OverviewMapControl.vue'
import TerritoriesControl from '@/components/map/TerritoriesControl.vue'
import SketchControl from '@/components/map/SketchControl.vue'
import TabPanelsControl from '@/components/map/TabPanelsControl.vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { StandardViewerSearch } from '@/lib/types'
import { takeLocationHandoff } from '@/lib/search/locationSearch'
import { createBaseLayerPresets, type BaseLayerId } from '@/ol/baseLayers'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

const presets = createBaseLayerPresets()
const activeBase = ref<BaseLayerId>('plan')
const baseLayers = computed(() => presets.map((p) => p.layer))

/** Recherche issue de l’accueil (handoff mémoire SPA — pas de query ni POST). */
const initialSearch = ref<StandardViewerSearch | null>(takeLocationHandoff())
const layerNodes = ref<TreeLayerNode[]>([
  {
    id: 'demo-plu',
    title: 'Document d’urbanisme (exemple)',
    visible: true,
    legend: [{ id: 'demo-plu-leg', title: 'Zonage PLU (exemple)' }],
  },
  {
    id: 'demo-sup',
    title: 'Servitude (exemple)',
    visible: false,
    legend: [{ id: 'demo-sup-leg', title: 'Servitude (exemple)' }],
  },
])

function onToggleLayer(id: string, visible: boolean) {
  const node = layerNodes.value.find((n) => n.id === id)
  if (node) node.visible = visible
}
</script>

<template>
  <div class="ec-demo-map">
    <main class="ec-layout ec-layout--map-only">
      <div class="ec-layout__map">
        <MapShell :layers="baseLayers">
          <!-- TabPanels avant SearchEngine pour que provide() soit dispo à l’inject -->
          <TabPanelsControl
            v-model:base-model-value="activeBase"
            :base-presets="presets"
            :layer-nodes="layerNodes"
            @toggle-layer="onToggleLayer"
          />
          <SearchEngineControl :initial-search="initialSearch" />
          <OverviewMapControl />
          <SketchControl />
          <TerritoriesControl />
          <ZoomControl />
          <FullScreenControl />
          <ScaleLineControl />
        </MapShell>
      </div>
    </main>
  </div>
</template>

<style scoped>
.ec-demo-map {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.ec-layout {
  flex: 1;
  min-height: 0;
  height: auto;
}
</style>
