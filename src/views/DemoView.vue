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
import BaseLayerSwitcher from '@/components/map/BaseLayerSwitcher.vue'
import LegendStub from '@/components/legend/LegendStub.vue'
import LayersTreeStub from '@/components/layers/LayersTreeStub.vue'
import type { LegendItem, LayerTreeNode } from '@/types/stubs'
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

const legendItems = ref<LegendItem[]>([
  { id: 'demo-plu', title: 'Document d’urbanisme (exemple)' },
  { id: 'demo-sup', title: 'Servitude (exemple)' },
])

const layerNodes = ref<LayerTreeNode[]>([
  { id: 'demo-plu', title: 'Document d’urbanisme (exemple)', visible: true },
  { id: 'demo-sup', title: 'Servitude (exemple)', visible: false },
])

function onToggleLayer(id: string, visible: boolean) {
  const node = layerNodes.value.find((n) => n.id === id)
  if (node) node.visible = visible
}
</script>

<template>
  <div class="ec-demo-map">
    <main class="ec-layout">
      <div class="ec-layout__map">
        <MapShell :layers="baseLayers">
          <SearchEngineControl :initial-search="initialSearch" />
          <OverviewMapControl />
          <TerritoriesControl />
          <ZoomControl />
          <FullScreenControl />
          <ScaleLineControl />
        </MapShell>
      </div>

      <aside
        class="ec-layout__panel"
        aria-label="Panneau cartographique"
      >
        <BaseLayerSwitcher
          v-model="activeBase"
          :presets="presets"
        />
        <LayersTreeStub
          :nodes="layerNodes"
          @toggle="onToggleLayer"
        />
        <hr class="fr-hr">
        <LegendStub :items="legendItems" />
      </aside>
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
