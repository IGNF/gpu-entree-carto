<script setup lang="ts">
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import type { FicheInfoDocumentTab } from '@/composables/tabPanels'
import {
  sanitizeTerritoryTabHtmlForPrint,
  territoryEmptyFallbackHtml,
} from '@/lib/map/print/printFicheSnapshot'
import { computed } from 'vue'
import '@/styles/fiche-info.css'
import '@/styles/map-print-supplement.css'

const props = defineProps<{
  documentTabs: FicheInfoDocumentTab[]
  title: string
}>()

const sanitizedTabs = computed(() =>
  props.documentTabs.map((tab) => ({
    ...tab,
    bodyHtml: sanitizeTerritoryTabHtmlForPrint(tab.bodyHtml),
  })),
)
</script>

<template>
  <article class="ec-print-supplement-page ec-print-fiche">
    <h2 class="ec-print-fiche__title">{{ title }}</h2>
    <div v-if="documentTabs.length" class="ec-print-fiche__sections">
      <section v-for="tab in sanitizedTabs" :key="tab.id" class="ec-print-fiche__section">
        <h3 class="ec-print-fiche__section-title">{{ tab.label }}</h3>
        <SanitizedHtml class="ec-fiche-info__body" :html="tab.bodyHtml" />
      </section>
    </div>
    <SanitizedHtml v-else class="ec-fiche-info__body" :html="territoryEmptyFallbackHtml()" />
  </article>
</template>
