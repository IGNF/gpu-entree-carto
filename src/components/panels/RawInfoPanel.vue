<script setup lang="ts">
/**
 * Contenu onglet 4 — attributs bruts (GetFeatureInfo plus tard).
 */
import { computed } from 'vue'
import type { FicheInfoSelection } from '@/composables/tabPanels'

const props = defineProps<{
  selection: FicheInfoSelection | null
}>()

const entries = computed(() => {
  const raw = props.selection?.raw
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw).map(([key, value]) => ({
    key,
    value:
      value === null || value === undefined
        ? '—'
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value),
  }))
})
</script>

<template>
  <section class="ec-raw-info" aria-label="Données brutes">
    <h2 class="ec-raw-info__title">
      Attributs
    </h2>
    <ul
      v-if="entries.length"
      class="ec-raw-info__list"
    >
      <li
        v-for="row in entries"
        :key="row.key"
      >
        <span class="ec-raw-info__key">{{ row.key }}</span>
        <span class="ec-raw-info__val">{{ row.value }}</span>
      </li>
    </ul>
    <div
      v-else
      class="ec-raw-info__placeholder"
    >
      <p>Accédez aux informations détaillées</p>
      <p class="fr-text--sm">
        Les attributs bruts de la sélection (GetFeatureInfo) s’afficheront ici.
      </p>
    </div>
  </section>
</template>
