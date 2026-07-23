<script setup lang="ts">
import { computed, ref } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import FullScreenControl from '@/components/map/FullScreenControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import BaseLayerSwitcher from '@/components/map/BaseLayerSwitcher.vue'
import LegendStub from '@/components/legend/LegendStub.vue'
import LayersTreeStub from '@/components/layers/LayersTreeStub.vue'
import type { LegendItem, LayerTreeNode } from '@/types/stubs'
import {
  createBaseLayerPresets,
  type BaseLayerId,
} from '@/ol/baseLayers'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@/styles/map-controls.css'

const presets = createBaseLayerPresets()
const activeBase = ref<BaseLayerId>('plan')
const baseLayers = computed(() => presets.map((p) => p.layer))

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
  <div class="ec-demo">
    <header class="fr-header ec-demo__header">
      <div class="fr-header__body">
        <div class="fr-container">
          <div class="fr-header__body-row">
            <div class="fr-header__brand fr-enlarge-link">
              <div class="fr-header__brand-top">
                <div class="fr-header__logo">
                  <p class="fr-logo">
                    République<br>Française
                  </p>
                </div>
              </div>
              <div class="fr-header__service">
                <p class="fr-header__service-title">
                  entree-carto
                </p>
                <p class="fr-header__service-tagline">
                  Démonstration — refonte GPU / DSFR
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="ec-layout">
      <div class="ec-layout__map">
        <MapShell :layers="baseLayers">
          <ZoomControl />
          <FullScreenControl />
          <ScaleLineControl />
        </MapShell>
      </div>

      <aside class="ec-layout__panel" aria-label="Panneau cartographique">
        <BaseLayerSwitcher v-model="activeBase" :presets="presets" />
        <LayersTreeStub :nodes="layerNodes" @toggle="onToggleLayer" />
        <hr class="fr-hr">
        <LegendStub :items="legendItems" />
      </aside>
    </main>
  </div>
</template>

<style scoped>
.ec-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
}

.ec-demo__header {
  flex-shrink: 0;
}

.ec-layout {
  flex: 1;
  min-height: 0;
}
</style>
