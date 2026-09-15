<script setup lang="ts">
/**
 * Onglet Catalogue — sous-onglets Données / Fonds de cartes (style barre de navigation).
 */
import { ref } from 'vue'
import CatalogLayerTree from '@/components/layers/CatalogLayerTree.vue'
import BaseLayerRadioList from '@/components/layers/BaseLayerRadioList.vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'
import '@gouvfr/dsfr/dist/component/navigation/navigation.min.css'
import '@/styles/layer-catalogue.css'

defineProps<{
  layerNodes: TreeLayerNode[]
  inStackById: Record<string, boolean>
  basePresets: GpuBaseLayerPreset[]
  baseModelValue: GpuBaseLayerId
}>()

const emit = defineEmits<{
  'update:baseModelValue': [id: GpuBaseLayerId]
  'catalog-toggle': [id: string, inStack: boolean]
}>()

const catalogueTab = ref<'donnees' | 'fonds'>('donnees')

function onCatalogToggle(id: string, checked: boolean) {
  emit('catalog-toggle', id, checked)
}
</script>

<template>
  <section class="ec-layer-catalogue" aria-labelledby="ec-layer-catalogue-title">
    <h2 id="ec-layer-catalogue-title" class="ec-layer-catalogue__title">
      <span class="ri-map-2-line ec-layer-catalogue__title-icon" aria-hidden="true" />
      Catalogue
    </h2>

    <nav
      class="fr-nav ec-layer-catalogue__nav"
      role="tablist"
      aria-label="Catalogue de couches"
    >
      <ul class="fr-nav__list">
        <li class="fr-nav__item">
          <button
            id="ec-catalog-tab-donnees"
            type="button"
            class="fr-nav__link ec-layer-catalogue__tab"
            role="tab"
            :aria-selected="catalogueTab === 'donnees'"
            :aria-current="catalogueTab === 'donnees' ? 'page' : undefined"
            aria-controls="ec-catalog-panel-donnees"
            :tabindex="catalogueTab === 'donnees' ? 0 : -1"
            @click="catalogueTab = 'donnees'"
          >
            Données
          </button>
        </li>
        <li class="fr-nav__item">
          <button
            id="ec-catalog-tab-fonds"
            type="button"
            class="fr-nav__link ec-layer-catalogue__tab"
            role="tab"
            :aria-selected="catalogueTab === 'fonds'"
            :aria-current="catalogueTab === 'fonds' ? 'page' : undefined"
            aria-controls="ec-catalog-panel-fonds"
            :tabindex="catalogueTab === 'fonds' ? 0 : -1"
            @click="catalogueTab = 'fonds'"
          >
            Fonds de cartes
          </button>
        </li>
      </ul>
    </nav>

    <div
      id="ec-catalog-panel-donnees"
      class="ec-layer-catalogue__panel"
      role="tabpanel"
      aria-labelledby="ec-catalog-tab-donnees"
      :hidden="catalogueTab !== 'donnees'"
    >
      <CatalogLayerTree
        v-if="layerNodes.length"
        :nodes="layerNodes"
        :checked-by-id="inStackById"
        @toggle="onCatalogToggle"
      />
      <p v-else class="ec-layer-catalogue__hint">Aucune couche dans LAYER_CONFIG.</p>
    </div>

    <div
      id="ec-catalog-panel-fonds"
      class="ec-layer-catalogue__panel"
      role="tabpanel"
      aria-labelledby="ec-catalog-tab-fonds"
      :hidden="catalogueTab !== 'fonds'"
    >
      <BaseLayerRadioList
        v-if="basePresets.length"
        :presets="basePresets"
        :model-value="baseModelValue"
        @update:model-value="emit('update:baseModelValue', $event)"
      />
      <p v-else class="ec-layer-catalogue__hint">Aucun fond de plan configuré.</p>
    </div>
  </section>
</template>

<style scoped>
.ec-layer-catalogue__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
  font-size: 1.125rem;
  font-weight: 700;
}

.ec-layer-catalogue__title-icon {
  flex: 0 0 auto;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--text-action-high-blue-france, #000091);
}

.ec-layer-catalogue__hint {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}
</style>
