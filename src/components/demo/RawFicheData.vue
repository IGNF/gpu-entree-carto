<script setup lang="ts">
/**
 * Données brutes de la réponse fiche-info (démo « Fiche info », onglet « Données brutes ») :
 * arbre repliable, champs non lus par la fiche grisés.
 */
import LoadingStatus from '@/components/common/LoadingStatus.vue'
import { computed } from 'vue'
import RawJsonNode from '@/components/demo/RawJsonNode.vue'
import { FICHE_USED_FIELDS } from '@/lib/demo/ficheUsedFields'

/** Clés ajoutées par entree-carto à la réponse (`ficheSelectionFromGpuApi`). */
const CLIENT_KEYS = ['lon', 'lat', 'mode', 'source'] as const

const props = defineProps<{
  raw: Record<string, unknown> | null | undefined
  mode: 'parcel' | 'territory'
  /** Fiche en cours de chargement (roue de patience). */
  loading?: boolean
}>()

const patterns = computed(() => FICHE_USED_FIELDS[props.mode])

/** Réponse gpu-site seule ; fiche parcelle chargée à part (`_parcelFiche`) rangée sous `parcelFiche`. */
const response = computed((): Record<string, unknown> | null => {
  const raw = props.raw
  if (!raw || raw.source !== 'gpu-fiche-info-api') return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if ((CLIENT_KEYS as readonly string[]).includes(key) || key.startsWith('_')) continue
    out[key] = value
  }
  if (!out.parcelFiche && raw._parcelFiche) out.parcelFiche = raw._parcelFiche
  return out
})

const clientKeys = computed(() =>
  CLIENT_KEYS.filter((key) => props.raw && key in props.raw).map(
    (key) => `${key} = ${String(props.raw?.[key])}`,
  ),
)
</script>

<template>
  <section class="ec-raw-fiche" aria-labelledby="ec-raw-fiche-title">
    <h2 id="ec-raw-fiche-title" class="fr-h5">Données brutes de la réponse</h2>
    <p class="ec-raw-fiche__legend fr-text--sm">
      <span class="ec-raw-node--used">Champ utilisé par la fiche</span> ·
      <span class="ec-raw-node--unused">Champ non utilisé (grisé)</span>
    </p>
    <LoadingStatus v-if="loading" label="Chargement de la réponse…" />
    <p v-else-if="!response" class="fr-text--sm">
      Cliquez sur la carte ou recherchez un lieu pour afficher la réponse.
    </p>
    <template v-else>
      <ul class="ec-raw-fiche__tree">
        <RawJsonNode
          v-for="(value, key) in response"
          :key="key"
          :name="String(key)"
          :value="value"
          :path="[String(key)]"
          :patterns="patterns"
          :depth="0"
        />
      </ul>
      <p v-if="clientKeys.length" class="ec-raw-fiche__client fr-text--xs">
        Ajouté par entree-carto (hors réponse) : {{ clientKeys.join(' · ') }}
      </p>
    </template>
  </section>
</template>

<style scoped>
.ec-raw-fiche__tree,
.ec-raw-fiche :deep(.ec-raw-node__children) {
  list-style: none;
  margin: 0;
  padding-left: 1rem;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.ec-raw-fiche__tree {
  padding-left: 0;
  max-height: 70vh;
  overflow: auto;
  border: 1px solid var(--border-default-grey, #ddd);
  padding: 0.5rem;
}

.ec-raw-fiche :deep(.ec-raw-node) {
  padding: 0;
  overflow-wrap: anywhere;
}

.ec-raw-fiche :deep(summary) {
  cursor: pointer;
}

.ec-raw-fiche :deep(.ec-raw-node__key) {
  font-weight: 700;
}

.ec-raw-fiche :deep(.ec-raw-node__summary),
.ec-raw-fiche :deep(.ec-raw-node__sep) {
  margin-left: 0.25rem;
  color: var(--text-mention-grey, #666);
}

.ec-raw-fiche :deep(.ec-raw-node__value) {
  margin-left: 0.25rem;
}

.ec-raw-fiche :deep(.ec-raw-node__value--string) {
  color: var(--text-default-success, #18753c);
}

.ec-raw-fiche :deep(.ec-raw-node__value--number),
.ec-raw-fiche :deep(.ec-raw-node__value--boolean) {
  color: var(--text-default-info, #0063cb);
}

/* Non utilisé par la fiche : grisé (texte et couleurs de valeur). */
.ec-raw-fiche :deep(.ec-raw-node--unused),
.ec-raw-fiche :deep(.ec-raw-node--unused *) {
  color: var(--text-disabled-grey, #929292) !important;
  font-weight: 400;
}

.ec-raw-fiche__legend .ec-raw-node--used {
  font-weight: 700;
}

.ec-raw-fiche__legend .ec-raw-node--unused {
  color: var(--text-disabled-grey, #929292);
}
</style>
