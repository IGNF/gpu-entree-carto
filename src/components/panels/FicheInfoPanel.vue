<script setup lang="ts">
/**
 * Contenu onglet 1 — fiche info / localisation.
 */
import { computed, ref, watch } from 'vue'
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import { DEFAULT_FICHE_EMPTY, type FicheInfoSelection } from '@/composables/tabPanels'
import { FICHE_LOADING_SPINNER_HTML } from '@/lib/fiche/ficheInfoHtml'
import { gpuClientConfigStatus } from '@/lib/demo/gpuClientConfigState'

const props = defineProps<{
  selection: FicheInfoSelection | null
}>()

const configLoading = computed(() => gpuClientConfigStatus.value === 'loading')

const title = computed(() => {
  if (configLoading.value) return 'Informations'
  return props.selection?.title ?? DEFAULT_FICHE_EMPTY.title
})

const dataLoading = computed(() => props.selection?.loading === 'data')
const headerHtml = computed(() => (configLoading.value ? '' : (props.selection?.headerHtml ?? '')))
const documentTabs = computed(() =>
  configLoading.value ? [] : (props.selection?.documentTabs ?? []),
)
const bodyHtml = computed(() => {
  if (configLoading.value || dataLoading.value) return FICHE_LOADING_SPINNER_HTML
  return props.selection?.bodyHtml ?? DEFAULT_FICHE_EMPTY.bodyHtml ?? ''
})

const activeDocTabId = ref<string | null>(null)

watch(
  () => props.selection,
  (sel) => {
    const tabs = sel?.documentTabs
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
</script>

<template>
  <article class="ec-fiche-info">
    <div class="ec-fiche-info__rail" aria-hidden="true" />
    <div class="ec-fiche-info__inner">
      <h2 class="ec-fiche-info__title">
        {{ title }}
      </h2>

      <SanitizedHtml
        v-if="configLoading || dataLoading"
        class="ec-fiche-info__body"
        :html="FICHE_LOADING_SPINNER_HTML"
        aria-live="polite"
      />

      <template v-else>
        <SanitizedHtml v-if="headerHtml" class="ec-fiche-info__header" :html="headerHtml" />

        <div v-if="documentTabs.length" class="ec-fiche-info__doc-tabs">
          <div
            class="ec-fiche-info__doc-tablist"
            role="tablist"
            aria-label="Documents et procédures"
          >
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

        <SanitizedHtml v-else class="ec-fiche-info__body" :html="bodyHtml" />
      </template>
    </div>
  </article>
</template>
