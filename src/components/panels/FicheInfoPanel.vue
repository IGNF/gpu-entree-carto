<script setup lang="ts">
/**
 * Contenu onglet fiche info — modes Parcelle / Territoire (gpu-client / Figma).
 */
import { computed, inject, ref, shallowRef, watch, type ShallowRef } from 'vue'
import { useMapLegendZoom } from '@/composables/useMapLegendZoom'
import type Map from 'ol/Map'
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import FicheCadastreReferencesModal from '@/components/panels/FicheCadastreReferencesModal.vue'
import { DEFAULT_FICHE_EMPTY, type FicheInfoSelection } from '@/composables/tabPanels'
import { useMapMode } from '@/composables/mapMode'
import { MAP_MODE_PARCEL, MAP_MODE_TERRITORY, type MapModeId } from '@/lib/map/mapMode'
import { FICHE_LOADING_SPINNER_HTML } from '@/lib/fiche/ficheInfoHtml'
import { gpuClientConfigStatus } from '@/lib/demo/gpuClientConfigState'
import { focusModeEmpriseOnMap } from '@/lib/map/focusModeEmprise'
import { loadParcelFicheDetail, refreshFicheForMapModeChange } from '@/lib/fiche/ficheInfoService'
import { resolveParcelIdFromRaw } from '@/lib/fiche/parcelId'
import { ficheCatalogVisibilityRevision } from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { isGpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFromGpuApi'
import {
  buildParcelDocumentsHtmlFromFiche,
  buildParcelInfosHtmlFromFiche,
  isGpuParcelFichePayload,
  type GpuParcelFichePayload,
} from '@/lib/fiche/parcelFicheFromGpuApi'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/component/tab/tab.min.css'
import '@gouvfr/dsfr/dist/component/button/button.min.css'
import '@/assets/custom-icons/custom-remix-icons.css'
import '@/styles/fiche-info.css'
import 'remixicon/fonts/remixicon.css'
import '@gouvfr/dsfr/dist/component/tile/tile.min.css'
import { syncFicheGeometryHighlight } from '@/lib/fiche/ficheGeometryHighlight'

const props = defineProps<{
  selection: FicheInfoSelection | null
}>()

const mapMode = useMapMode()
const mapRef = inject<ShallowRef<Map | null>>('olMap', shallowRef(null))
const { legendZoom } = useMapLegendZoom(mapRef)

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
  return mapMode.mode.value
})

const showParcelLayout = computed(() => effectiveMode.value === MAP_MODE_PARCEL)
const showTerritoryLayout = computed(() => effectiveMode.value === MAP_MODE_TERRITORY)

const parcelLabel = computed(
  () => props.selection?.parcelLabel ?? props.selection?.title ?? 'Parcelle',
)
const parcelSwitchLabel = computed(
  () => props.selection?.parcelSwitchLabel ?? props.selection?.parcelLabel ?? 'Parcelle',
)
const territoryTitle = computed(
  () => props.selection?.territoryTitle ?? props.selection?.title ?? 'Territoire',
)

const documentTabs = computed(() =>
  configLoading.value ? [] : (props.selection?.documentTabs ?? []),
)

const activeParcelTab = ref<'infos' | 'documents'>('infos')
const parcelTabLoading = ref(false)
const parcelTabError = ref<string | null>(null)
const cadastreModalOpen = ref(false)

function parcelFicheKey(selection: FicheInfoSelection | null): string {
  if (!selection) return ''
  const raw = selection.raw && typeof selection.raw === 'object' ? selection.raw : null
  return resolveParcelIdFromRaw(raw) ?? selection.parcelLabel ?? selection.title ?? ''
}

const parcelDetailReady = computed(() => {
  const s = props.selection
  return Boolean(s?.parcelInfosHtml?.trim() && s?.parcelDocumentsHtml?.trim())
})

watch(
  () => props.selection?.raw,
  (raw) => {
    const record = raw && typeof raw === 'object' ? raw : null
    syncFicheGeometryHighlight(mapRef.value, record)
  },
  { immediate: true, deep: true },
)

watch(
  () => parcelFicheKey(props.selection),
  (next, prev) => {
    if (next === prev) return
    activeParcelTab.value = 'infos'
    parcelTabLoading.value = false
    parcelTabError.value = null
    cadastreModalOpen.value = false
  },
)

watch(
  () => [parcelFicheKey(props.selection), parcelDetailReady.value, showParcelLayout.value] as const,
  ([key, ready, parcelMode]) => {
    if (!parcelMode || !key || ready || props.selection?.parcelMissingAtPoint) return
    void loadParcelDetail()
  },
  { immediate: true },
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
  const zoom = legendZoom.value
  if (mapMode.mode.value !== MAP_MODE_PARCEL) {
    mapMode.setMode(MAP_MODE_PARCEL)
    refreshFicheForMapModeChange(MAP_MODE_PARCEL, zoom)
    return
  }
  const map = mapRef.value
  if (map) await focusModeEmpriseOnMap(map, MAP_MODE_PARCEL)
}

async function activateTerritoryMode(): Promise<void> {
  const zoom = legendZoom.value
  if (mapMode.mode.value !== MAP_MODE_TERRITORY) {
    mapMode.setMode(MAP_MODE_TERRITORY)
    refreshFicheForMapModeChange(MAP_MODE_TERRITORY, zoom)
    return
  }
  const map = mapRef.value
  if (map) await focusModeEmpriseOnMap(map, MAP_MODE_TERRITORY)
}

async function loadParcelDetail(): Promise<void> {
  if (!props.selection || parcelDetailReady.value) return
  parcelTabError.value = null
  parcelTabLoading.value = true
  try {
    await loadParcelFicheDetail(props.selection)
  } catch (e) {
    parcelTabError.value =
      e instanceof Error ? e.message : 'Impossible de charger la fiche parcelle.'
  } finally {
    parcelTabLoading.value = false
  }
}

function printParcelFiche(): void {
  const html =
    activeParcelTab.value === 'documents'
      ? parcelDocumentsDisplayHtml.value
      : parcelInfosDisplayHtml.value
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

function parcelFichePayloadFromSelection(
  selection: FicheInfoSelection | null,
): GpuParcelFichePayload | null {
  const raw = selection?.raw
  if (!raw || typeof raw !== 'object') return null
  const payload = raw._parcelFiche
  return isGpuParcelFichePayload(payload) ? payload : null
}

const parcelDetailCached = computed(() => Boolean(parcelFichePayloadFromSelection(props.selection)))

/** Pictos scaleDependant recalculés au zoom (données `_parcelFiche`, pas le HTML figé en cache). */
const parcelInfosDisplayHtml = computed((): string => {
  void ficheCatalogVisibilityRevision.value
  if (!parcelDetailReady.value) return ''
  const payload = parcelFichePayloadFromSelection(props.selection)
  if (payload) {
    return buildParcelInfosHtmlFromFiche(payload, legendZoom.value)
  }
  return props.selection?.parcelInfosHtml ?? '<p>Aucune information.</p>'
})

const parcelDocumentsDisplayHtml = computed((): string => {
  void ficheCatalogVisibilityRevision.value
  if (!parcelDetailReady.value) return ''
  const payload = parcelFichePayloadFromSelection(props.selection)
  if (payload) {
    const raw = props.selection?.raw
    const ficheApi = raw && typeof raw === 'object' && isGpuFicheInfoPayload(raw) ? raw : null
    return buildParcelDocumentsHtmlFromFiche(payload, ficheApi)
  }
  return props.selection?.parcelDocumentsHtml ?? ''
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
            v-if="(parcelTabLoading || !parcelDetailReady) && activeParcelTab === 'infos'"
            class="ec-fiche-info__load-wrap"
          >
            <SanitizedHtml
              v-if="parcelTabLoading"
              class="ec-fiche-info__body"
              :html="FICHE_LOADING_SPINNER_HTML"
            />
            <SanitizedHtml
              v-else-if="selection?.parcelInfosHtml"
              class="ec-fiche-info__body"
              :html="selection.parcelInfosHtml"
            />
            <p v-if="parcelTabError" class="ec-fiche-info__error">{{ parcelTabError }}</p>
          </div>
          <template v-else-if="parcelDetailReady">
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
            <SanitizedHtml class="ec-fiche-info__body" :html="parcelInfosDisplayHtml" />
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
            v-if="(parcelTabLoading || !parcelDetailReady) && activeParcelTab === 'documents'"
            class="ec-fiche-info__load-wrap"
          >
            <SanitizedHtml
              v-if="parcelTabLoading"
              class="ec-fiche-info__body"
              :html="FICHE_LOADING_SPINNER_HTML"
            />
            <SanitizedHtml
              v-else-if="parcelDocumentsDisplayHtml"
              class="ec-fiche-info__body"
              :html="parcelDocumentsDisplayHtml"
            />
            <p v-if="parcelTabError" class="ec-fiche-info__error">{{ parcelTabError }}</p>
          </div>
          <SanitizedHtml
            v-else
            class="ec-fiche-info__body"
            :html="parcelDocumentsDisplayHtml || '<p>Aucun document.</p>'"
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
        v-if="selection?.parcelSwitchLabel || selection?.parcelLabel"
        type="button"
        class="ec-fiche-info__back-parcel fr-btn fr-btn--tertiary fr-btn--icon-left"
        @click="activateParcelMode"
      >
        <span class="ri-arrow-left-line" aria-hidden="true" />
        <template v-if="selection?.parcelMissingAtPoint">{{ parcelSwitchLabel }}</template>
        <template v-else>Parcelle {{ parcelSwitchLabel }}</template>
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
