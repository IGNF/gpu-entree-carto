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
import { loadParcelFicheTabContent } from '@/lib/fiche/ficheInfoService'
import { isGpuParcelFichePayload } from '@/lib/fiche/parcelFicheFromGpuApi'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/component/tab/tab.min.css'
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
const parcelTabLoading = ref(false)
const parcelTabError = ref<string | null>(null)
const cadastreModalOpen = ref(false)

watch(
  () => props.selection,
  () => {
    activeParcelTab.value = 'infos'
    infosLoaded.value = false
    documentsLoaded.value = false
    parcelTabLoading.value = false
    parcelTabError.value = null
    cadastreModalOpen.value = false
  },
)

const activeDocTabId = ref<string | null>(null)
watch(
  () => props.selection?.documentTabs,
  (tabs) => {
    activeDocTabId.value = tabs?.length ? tabs[0].id : null
  },
  { immediate: true },
)

const activeDocTab = computed(() => {
  const tabs = documentTabs.value
  if (!tabs.length) return null
  const id = activeDocTabId.value
  return tabs.find((t) => t.id === id) ?? tabs[0]
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
  if (mapMode.mode.value !== MAP_MODE_TERRITORY) {
    mapMode.setMode(MAP_MODE_TERRITORY)
    return
  }
  const map = mapRef.value
  if (map) await focusModeEmpriseOnMap(map, MAP_MODE_TERRITORY)
}

async function ensureParcelFicheTab(tab: 'infos' | 'documents'): Promise<void> {
  if (!props.selection) return
  if (tab === 'infos' && infosLoaded.value) return
  if (tab === 'documents' && documentsLoaded.value) return
  parcelTabError.value = null
  parcelTabLoading.value = true
  try {
    await loadParcelFicheTabContent(props.selection, tab)
    if (tab === 'infos') infosLoaded.value = true
    else documentsLoaded.value = true
  } catch (e) {
    parcelTabError.value =
      e instanceof Error ? e.message : 'Impossible de charger la fiche parcelle.'
  } finally {
    parcelTabLoading.value = false
  }
}

function loadParcelInfos(): void {
  void ensureParcelFicheTab('infos')
}

function loadParcelDocuments(): void {
  void ensureParcelFicheTab('documents')
}

function printParcelFiche(): void {
  const html =
    activeParcelTab.value === 'documents'
      ? props.selection?.parcelDocumentsHtml
      : props.selection?.parcelInfosHtml
  if (!html || typeof window === 'undefined') return
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return
  w.document.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche parcelle</title></head><body>${html}</body></html>`,
  )
  w.document.close()
  w.focus()
  w.print()
}

const parcelDetailCached = computed(() => {
  const raw = props.selection?.raw
  return Boolean(raw && typeof raw === 'object' && isGpuParcelFichePayload(raw._parcelFiche))
})

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

      <div class="fr-tabs ec-fiche-info__tabs">
        <ul class="fr-tabs__list" role="tablist" aria-label="Fiche parcelle">
          <li role="presentation">
            <button
              id="ec-fiche-parcel-tab-infos"
              type="button"
              role="tab"
              class="fr-tabs__tab"
              :aria-selected="activeParcelTab === 'infos'"
              aria-controls="ec-fiche-parcel-panel-infos"
              @click="activeParcelTab = 'infos'"
            >
              Infos
            </button>
          </li>
          <li role="presentation">
            <button
              id="ec-fiche-parcel-tab-documents"
              type="button"
              role="tab"
              class="fr-tabs__tab"
              :aria-selected="activeParcelTab === 'documents'"
              aria-controls="ec-fiche-parcel-panel-documents"
              @click="activeParcelTab = 'documents'"
            >
              Documents
            </button>
          </li>
        </ul>

        <div
          id="ec-fiche-parcel-panel-infos"
          class="fr-tabs__panel ec-fiche-info__parcel-panel"
          :class="{ 'fr-tabs__panel--selected': activeParcelTab === 'infos' }"
          role="tabpanel"
          aria-labelledby="ec-fiche-parcel-tab-infos"
          :tabindex="activeParcelTab === 'infos' ? 0 : -1"
        >
          <div
            v-if="parcelTabLoading && activeParcelTab === 'infos'"
            class="ec-fiche-info__load-wrap"
          >
            <SanitizedHtml class="ec-fiche-info__body" :html="FICHE_LOADING_SPINNER_HTML" />
          </div>
          <div v-else-if="!infosLoaded" class="ec-fiche-info__load-wrap">
            <button type="button" class="fr-btn fr-btn--secondary" @click="loadParcelInfos">
              <span class="ri-refresh-line" aria-hidden="true" />
              Charger les informations
            </button>
            <p v-if="parcelTabError" class="ec-fiche-info__error">{{ parcelTabError }}</p>
          </div>
          <template v-else>
            <div class="ec-fiche-info__infos-toolbar">
              <h3 class="ec-fiche-info__section-title">Règles d’urbanisme</h3>
              <button
                type="button"
                class="fr-btn fr-btn--secondary fr-btn--sm"
                :disabled="!parcelDetailCached"
                title="Imprimer la fiche parcelle"
                @click="printParcelFiche"
              >
                <span class="ri-printer-line" aria-hidden="true" />
                Imprimer
              </button>
            </div>
            <SanitizedHtml
              class="ec-fiche-info__body"
              :html="selection?.parcelInfosHtml ?? '<p>Aucune information.</p>'"
            />
          </template>
        </div>

        <div
          id="ec-fiche-parcel-panel-documents"
          class="fr-tabs__panel ec-fiche-info__parcel-panel"
          :class="{ 'fr-tabs__panel--selected': activeParcelTab === 'documents' }"
          role="tabpanel"
          aria-labelledby="ec-fiche-parcel-tab-documents"
          :tabindex="activeParcelTab === 'documents' ? 0 : -1"
        >
          <div
            v-if="parcelTabLoading && activeParcelTab === 'documents'"
            class="ec-fiche-info__load-wrap"
          >
            <SanitizedHtml class="ec-fiche-info__body" :html="FICHE_LOADING_SPINNER_HTML" />
          </div>
          <div v-else-if="!documentsLoaded" class="ec-fiche-info__load-wrap">
            <button type="button" class="fr-btn fr-btn--secondary" @click="loadParcelDocuments">
              <span class="ri-refresh-line" aria-hidden="true" />
              Charger les informations
            </button>
            <p v-if="parcelTabError" class="ec-fiche-info__error">{{ parcelTabError }}</p>
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

      <div v-if="documentTabs.length" class="fr-tabs ec-fiche-info__tabs">
        <ul class="fr-tabs__list" role="tablist" aria-label="Documents et procédures">
          <li v-for="tab in documentTabs" :key="tab.id" role="presentation">
            <button
              :id="`ec-fiche-doc-tab-${tab.id}`"
              type="button"
              role="tab"
              class="fr-tabs__tab"
              :aria-selected="activeDocTab?.id === tab.id"
              :aria-controls="`ec-fiche-doc-panel-${tab.id}`"
              @click="selectDocTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </li>
        </ul>
        <SanitizedHtml
          v-for="tab in documentTabs"
          :id="`ec-fiche-doc-panel-${tab.id}`"
          :key="tab.id"
          class="fr-tabs__panel ec-fiche-info__body ec-fiche-info__doc-panel"
          :class="{ 'fr-tabs__panel--selected': activeDocTab?.id === tab.id }"
          role="tabpanel"
          :aria-labelledby="`ec-fiche-doc-tab-${tab.id}`"
          :tabindex="activeDocTab?.id === tab.id ? 0 : -1"
          :html="tab.bodyHtml"
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
