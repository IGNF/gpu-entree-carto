<script setup lang="ts">
/**
 * Démo « Fiche info » : carte avec le panneau (sans couches de données ni légendes, avec un onglet
 * « Données brutes » : réponse fiche-info, champs non utilisés grisés), la recherche de lieu, le sélecteur
 * de mode et le clic de la carte principale (activable par un bouton) ; identifiant de parcelle au-dessus
 * de la carte. Sans permalien ni impression.
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import TabPanelsControl from '@/components/map/TabPanelsControl.vue'
import SearchEngineControl from '@/components/map/SearchEngineControl.vue'
import ClickInfoControl from '@/components/map/ClickInfoControl.vue'
import MapModeSelector from '@/components/map/MapModeSelector.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import RotateControl from '@/components/map/RotateControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import ParcelIdForm from '@/components/demo/ParcelIdForm.vue'
import RawFicheData from '@/components/demo/RawFicheData.vue'
import { provideMapMode } from '@/composables/mapMode'
import { TAB_PANEL_IDS, tabPanelsApiRef } from '@/composables/tabPanels'
import { useDemoLayerCatalog } from '@/composables/useDemoLayerCatalog'
import { getDemoConfig, prepareDemoEnvironment } from '@/lib/demo/demoConfig'
import { queryFicheAtMapPoint } from '@/lib/fiche/queryFicheAtMapPoint'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import { resetMapPermalinkState, resumeMapPermalinkHashWrites } from '@/lib/map/mapPermalink'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@/styles/map-controls.css'
import '@/styles/click-info.css'

/** Zoom de la fiche pour un identifiant de parcelle (vue recentrée ensuite sur la parcelle). */
const PARCEL_ID_FICHE_ZOOM = 17
const HIDDEN_TABS = [TAB_PANEL_IDS.dataLayers, TAB_PANEL_IDS.legends]
const RAW_TAB = {
  label: 'Données brutes',
  iconKind: 'remix',
  iconClass: 'ri-code-s-slash-line',
} as const

// Avant le montage du panneau : sinon la cerise et les couches de la carte principale seraient reprises ;
// l’adresse n’est plus écrite tant que la démo est ouverte.
resetMapPermalinkState()

const mapMode = provideMapMode({ initial: MAP_MODE_PARCEL, syncUrl: false })

const mapShellRef = ref<InstanceType<typeof MapShell> | null>(null)
const mapRef = computed(() => mapShellRef.value?.map ?? null)
const {
  basePresets,
  activeBase,
  mapLayers,
  layerNodes,
  catalogLayersLoading,
  layerMapHooks,
  applyLayerNodes,
  onUpdateBase,
  onToggleLayer,
} = useDemoLayerCatalog(mapRef)

/** Même sélection que l’onglet fiche (catalogue, rechargements compris). */
const selection = computed(() => tabPanelsApiRef.value?.selection.value ?? null)
/** Mode de la fiche affichée (peut précéder un changement de mode pas encore rechargé). */
const rawMode = computed(() =>
  (selection.value?.mapMode ?? mapMode.mode.value) === MAP_MODE_TERRITORY ? 'territory' : 'parcel',
)

async function onParcelLocated(point: { lon: number; lat: number }): Promise<void> {
  // Passage en Parcelle d’abord : le sélecteur de mode traite l’ancienne cerise (fiche déjà en cache) avant
  // l’interrogation de la parcelle — sinon il rechargerait aussi la nouvelle (requête en double).
  mapMode.setMode(MAP_MODE_PARCEL)
  await nextTick()
  queryFicheAtMapPoint({ ...point, mode: MAP_MODE_PARCEL, zoom: PARCEL_ID_FICHE_ZOOM })
}

onMounted(async () => {
  await prepareDemoEnvironment(getDemoConfig())
  applyLayerNodes()
})

onUnmounted(() => {
  resumeMapPermalinkHashWrites()
})
</script>

<template>
  <div class="ec-fiche-demo fr-container--fluid fr-px-2w fr-py-3w">
    <h1 class="fr-h3 fr-mb-1w">Fiche info</h1>
    <p class="fr-text--sm fr-mb-2w">
      Cliquez sur la carte, recherchez un lieu ou saisissez un identifiant de parcelle : la parcelle
      (mode Parcelle) ou la commune (mode Territoire) est entourée en rouge et sa fiche s’affiche
      dans le panneau ; l’onglet « Données brutes » montre la réponse du service.
    </p>
    <ParcelIdForm class="fr-mb-2w" @locate="onParcelLocated" />

    <div class="ec-fiche-demo__map">
      <MapShell ref="mapShellRef" :layers="mapLayers">
        <TabPanelsControl
          :base-model-value="activeBase"
          :base-presets="basePresets"
          :layer-nodes="layerNodes"
          :catalog-layers-loading="catalogLayersLoading"
          :layer-map-hooks="layerMapHooks"
          :hidden-tabs="HIDDEN_TABS"
          :extra-tab="RAW_TAB"
          @update:base-model-value="onUpdateBase"
          @toggle-layer="onToggleLayer"
        >
          <template #extra>
            <RawFicheData
              :raw="selection?.raw"
              :mode="rawMode"
              :loading="selection?.loading === 'data'"
            />
          </template>
        </TabPanelsControl>
        <SearchEngineControl />
        <MapModeSelector />
        <ClickInfoControl toggleable />
        <RotateControl />
        <ZoomControl />
        <ScaleLineControl />
      </MapShell>
    </div>
  </div>
</template>

<style scoped>
/* Enfant flex de `.ec-app` (hauteur de l’écran) : sans cela il est écrasé et le bas de page coupé. */
.ec-fiche-demo {
  flex-shrink: 0;
}

.ec-fiche-demo__map {
  position: relative;
  height: 75vh;
  min-height: 24rem;
}

.ec-fiche-demo__map :deep(.ec-map-shell) {
  height: 100%;
}
</style>
