<script setup lang="ts">
/**
 * Contenu onglet fiche info — modes Parcelle / Territoire (gpu-client / Figma).
 */
import { computed, inject, ref, shallowRef, watch, type ShallowRef } from 'vue'
import type Map from 'ol/Map'
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import FicheCadastreReferencesModal from '@/components/panels/FicheCadastreReferencesModal.vue'
import { DEFAULT_FICHE_EMPTY, type FicheInfoSelection } from '@/composables/tabPanels'
import { useMapMode } from '@/composables/mapMode'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { FICHE_LOADING_SPINNER_HTML } from '@/lib/fiche/ficheInfoHtml'
import { gpuClientConfigStatus } from '@/lib/demo/gpuClientConfigState'
import { focusModeEmpriseOnMap } from '@/lib/map/focusModeEmprise'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/assets/custom-icons/custom-remix-icons.css'
import '@/styles/fiche-info.css'
import 'remixicon/fonts/remixicon.css'

const props = defineProps<{
  selection: FicheInfoSelection | null
}>()

const mapMode = useMapMode()
const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))

const configLoading = computed(() => gpuClientConfigStatus.value === 'loading')
const dataLoading = computed(() => props.selection?.loading === 'data')

const isEmpty = computed(
  () =>
    !configLoading.value &&
    !dataLoading.value &&
    !props.selection?.mapMode &&
    !props.selection?.raw,
)

const effectiveMode = computed((): MapModeId | null => {
  if (configLoading.value || dataLoading.value || isEmpty.value) return null
  return props.selection?.mapMode ?? mapMode.mode.value
})

const showParcelLayout = computed(() => effectiveMode.value === MAP_MODE_PARCEL)
const showTerritoryLayout = computed(() => effectiveMode.value === MAP_MODE_TERRITORY)

const parcelLabel = computed(
  () => props.selection?.parcelLabel ?? props.selection?.title ?? 'Parcelle',
)
const territoryTitle = computed(
  () => props.selection?.territoryTitle ?? props.selection?.title ?? 'Territoire',
)

const documentTabs = computed(() =>
  configLoading.value ? [] : (props.selection?.documentTabs ?? []),
)

const activeParcelTab = ref<'infos' | 'documents'>('infos')
const infosLoaded = ref(false)
const documentsLoaded = ref(false)
const cadastreModalOpen = ref(false)

watch(
  () => props.selection,
  () => {
    activeParcelTab.value = 'infos'
    infosLoaded.value = false
    documentsLoaded.value = false
    cadastreModalOpen.value = false
  },
)

const activeDocTabId = ref<string | null>(null)
watch(
  () => props.selection?.documentTabs,
  (tabs) => {
    activeDocTabId.value = tabs?.length ? tabs[0]!.id : null
  },
  { immediate: true },
)

const activeDocTab = computed(() => {
  const tabs = documentTabs.value
  if (!tabs.length) return null
  const id = activeDocTabId.value
  return tabs.find((t) => t.id === id) ?? tabs[0]!
})

function selectDocTab(id: string): void {
  activeDocTabId.value = id
}

async function activateParcelMode(): Promise<void> {
  if (mapMode.mode.value !== MAP_MODE_PARCEL) {
    mapMode.setMode(MAP_MODE_PARCEL)
    return
  }
  const map = mapRef.value
  if (map) await focusModeEmpriseOnMap(map, MAP_MODE_PARCEL)
}

async function activateTerritoryMode(): Promise<void> {
  if (!props.selection?.territoryTitle) return
  if (mapMode.mode.value !== MAP_MODE_TERRITORY) {
    mapMode.setMode(MAP_MODE_TERRITORY)
    return
  }
  const map = mapRef.value
  if (map) await focusModeEmpriseOnMap(map, MAP_MODE_TERRITORY)
}

function loadParcelInfos(): void {
  infosLoaded.value = true
}

function loadParcelDocuments(): void {
  documentsLoaded.value = true
}

const emptyBodyHtml = computed(
  () => props.selection?.bodyHtml ?? DEFAULT_FICHE_EMPTY.bodyHtml ?? '',
)
</script>

<template>
  <article class="ec-fiche-info" :class="{ 'ec-fiche-info--territory': showTerritoryLayout }">
    <SanitizedHtml
      v-if="configLoading || dataLoading"
      class="ec-fiche-info__body"
      :html="FICHE_LOADING_SPINNER_HTML"
      aria-live="polite"
    />

    <div v-else-if="isEmpty" class="ec-fiche-info__inner">
      <h2 class="ec-fiche-info__title">{{ DEFAULT_FICHE_EMPTY.title }}</h2>
      <SanitizedHtml class="ec-fiche-info__body" :html="emptyBodyHtml" />
    </div>

    <!-- Mode Parcelle -->
    <div v-else-if="showParcelLayout" class="ec-fiche-info__inner ec-fiche-info__inner--parcel">
      <header class="ec-fiche-info__topbar">
        <div class="ec-fiche-info__mode-tags">
          <a
            href="#"
            class="fr-tag fr-tag--purple-glycine ec-fiche-info__mode-tag-link"
            @click.prevent="activateParcelMode"
          >
            <span class="ec-fiche-info__mode-tag-icon ec-icon-parcelle" aria-hidden="true" />
            Parcelle
          </a>
        </div>
        <button
          v-if="selection?.cadastreReferences"
          type="button"
          class="ec-fiche-info__info-btn fr-btn fr-btn--tertiary fr-btn--icon-left"
          title="Références cadastrales"
          @click="cadastreModalOpen = true"
        >
          <span class="ri-information-line" aria-hidden="true" />
          <span class="visually-hidden">Références cadastrales</span>
        </button>
      </header>

      <h2 class="ec-fiche-info__title">{{ parcelLabel }}</h2>

      <button
        v-if="selection?.territoryTitle"
        type="button"
        class="ec-fiche-info__territory-cta fr-btn fr-btn--primary"
        @click="activateTerritoryMode"
      >
        {{ territoryTitle }}
        <span class="ri-arrow-right-line" aria-hidden="true" />
      </button>

      <div class="ec-fiche-info__doc-tabs">
        <div class="ec-fiche-info__doc-tablist" role="tablist" aria-label="Fiche parcelle">
          <button
            type="button"
            role="tab"
            class="ec-fiche-info__doc-tab"
            :class="{ 'is-active': activeParcelTab === 'infos' }"
            :aria-selected="activeParcelTab === 'infos'"
            @click="activeParcelTab = 'infos'"
          >
            Infos
          </button>
          <button
            type="button"
            role="tab"
            class="ec-fiche-info__doc-tab"
            :class="{ 'is-active': activeParcelTab === 'documents' }"
            :aria-selected="activeParcelTab === 'documents'"
            @click="activeParcelTab = 'documents'"
          >
            Documents
          </button>
        </div>

        <div
          v-show="activeParcelTab === 'infos'"
          class="ec-fiche-info__parcel-panel"
          role="tabpanel"
        >
          <div v-if="!infosLoaded" class="ec-fiche-info__load-wrap">
            <button type="button" class="fr-btn fr-btn--secondary" @click="loadParcelInfos">
              <span class="ri-refresh-line" aria-hidden="true" />
              Charger les informations
            </button>
          </div>
          <template v-else>
            <div class="ec-fiche-info__infos-toolbar">
              <h3 class="ec-fiche-info__section-title">Règles d’urbanisme</h3>
              <button
                type="button"
                class="fr-btn fr-btn--secondary fr-btn--sm"
                disabled
                title="Bientôt disponible"
              >
                <span class="ri-printer-line" aria-hidden="true" />
                Imprimer la fiche parcelle
              </button>
            </div>
            <SanitizedHtml
              class="ec-fiche-info__body"
              :html="selection?.parcelInfosHtml ?? '<p>Aucune information.</p>'"
            />
          </template>
        </div>

        <div
          v-show="activeParcelTab === 'documents'"
          class="ec-fiche-info__parcel-panel"
          role="tabpanel"
        >
          <div v-if="!documentsLoaded" class="ec-fiche-info__load-wrap">
            <button type="button" class="fr-btn fr-btn--secondary" @click="loadParcelDocuments">
              <span class="ri-refresh-line" aria-hidden="true" />
              Charger les informations
            </button>
          </div>
          <SanitizedHtml
            v-else
            class="ec-fiche-info__body"
            :html="selection?.parcelDocumentsHtml ?? '<p>Aucun document.</p>'"
          />
        </div>
      </div>
    </div>

    <!-- Mode Territoire -->
    <div
      v-else-if="showTerritoryLayout"
      class="ec-fiche-info__inner ec-fiche-info__inner--territory"
    >
      <button
        v-if="selection?.parcelLabel"
        type="button"
        class="ec-fiche-info__back-parcel fr-btn fr-btn--tertiary fr-btn--icon-left"
        @click="activateParcelMode"
      >
        <span class="ri-arrow-left-line" aria-hidden="true" />
        Parcelle {{ parcelLabel }}
      </button>

      <header class="ec-fiche-info__topbar">
        <div class="ec-fiche-info__mode-tags">
          <a
            href="#"
            class="fr-tag fr-tag--green-archipel ec-fiche-info__mode-tag-link"
            @click.prevent="activateTerritoryMode"
          >
            <span
              class="ec-fiche-info__mode-tag-icon fr-icon fr-icon-france-fill"
              aria-hidden="true"
            />
            Territoire
          </a>
        </div>
      </header>

      <h2 class="ec-fiche-info__title">{{ territoryTitle }}</h2>

      <div v-if="documentTabs.length" class="ec-fiche-info__doc-tabs">
        <div class="ec-fiche-info__doc-tablist" role="tablist" aria-label="Documents et procédures">
          <button
            v-for="tab in documentTabs"
            :id="`ec-fiche-doc-tab-${tab.id}`"
            :key="tab.id"
            type="button"
            role="tab"
            class="ec-fiche-info__doc-tab"
            :class="{ 'is-active': activeDocTab?.id === tab.id }"
            :aria-selected="activeDocTab?.id === tab.id"
            :aria-controls="`ec-fiche-doc-panel-${tab.id}`"
            @click="selectDocTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
        <SanitizedHtml
          v-if="activeDocTab"
          :id="`ec-fiche-doc-panel-${activeDocTab.id}`"
          :key="activeDocTab.id"
          class="ec-fiche-info__body ec-fiche-info__doc-panel"
          role="tabpanel"
          :aria-labelledby="`ec-fiche-doc-tab-${activeDocTab.id}`"
          :html="activeDocTab.bodyHtml"
        />
      </div>
      <SanitizedHtml v-else class="ec-fiche-info__body" :html="emptyBodyHtml" />
    </div>

    <div v-else class="ec-fiche-info__inner">
      <h2 class="ec-fiche-info__title">{{ selection?.title }}</h2>
      <SanitizedHtml class="ec-fiche-info__body" :html="selection?.bodyHtml ?? ''" />
    </div>

    <Teleport to="body">
      <FicheCadastreReferencesModal
        :open="cadastreModalOpen"
        :references="selection?.cadastreReferences ?? null"
        @close="cadastreModalOpen = false"
      />
    </Teleport>
  </article>
</template>
