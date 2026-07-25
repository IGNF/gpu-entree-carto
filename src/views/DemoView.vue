<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
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
import {
  createBaseLayerPresets,
  type BaseLayerId,
} from '@/ol/baseLayers'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

const route = useRoute()
const presets = createBaseLayerPresets()
const activeBase = ref<BaseLayerId>('plan')
const baseLayers = computed(() => presets.map((p) => p.layer))

/** Recherche issue de l’accueil (query municipality / position / type). */
const initialSearch = computed<StandardViewerSearch | null>(() => {
  const municipality = String(route.query.municipality ?? '').trim()
  if (!municipality) return null
  const x = Number(route.query.position_x)
  const y = Number(route.query.position_y)
  const type = String(route.query.type ?? '').trim()
  const kind = String(route.query.kind ?? '').trim()
  const poiTypeRaw = String(route.query.poiType ?? '').trim()
  const poiType = poiTypeRaw
    ? poiTypeRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  return {
    fullText: municipality,
    type: type || undefined,
    kind: kind || undefined,
    poiType,
    position:
      Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined,
  }
})

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
