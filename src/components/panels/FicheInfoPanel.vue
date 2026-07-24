<script setup lang="ts">
/**
 * Contenu onglet 1 — fiche info / localisation.
 */
import { computed } from 'vue'
import {
  DEFAULT_FICHE_EMPTY,
  type FicheInfoSelection,
} from '@/composables/tabPanels'

const props = defineProps<{
  selection: FicheInfoSelection | null
}>()

const title = computed(() => props.selection?.title ?? DEFAULT_FICHE_EMPTY.title)
const bodyHtml = computed(
  () => props.selection?.bodyHtml ?? DEFAULT_FICHE_EMPTY.bodyHtml,
)
</script>

<template>
  <article class="ec-fiche-info">
    <div
      class="ec-fiche-info__rail"
      aria-hidden="true"
    />
    <div class="ec-fiche-info__inner">
      <h2 class="ec-fiche-info__title">
        {{ title }}
      </h2>
      <div
        class="ec-fiche-info__body"
        v-html="bodyHtml"
      />
    </div>
  </article>
</template>
