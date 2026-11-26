<script setup lang="ts">
/**
 * Démo « Fiche parcelle » : saisie d’un identifiant de parcelle (`34_301_000_000_AS_0136` ou
 * `34301000000AS0136`), localisée par le géocodage IGN puis interrogée comme un clic carte.
 */
import { ref } from 'vue'
import { parseParcelIdInput } from '@/lib/fiche/parcelId'
import { locateParcelById } from '@/lib/search/locateParcelById'

const emit = defineEmits<{ locate: [point: { lon: number; lat: number }] }>()

const value = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit(): Promise<void> {
  const parts = parseParcelIdInput(value.value)
  if (!parts) {
    error.value = 'Format attendu : 34_301_000_000_AS_0136 ou 34301000000AS0136.'
    return
  }
  error.value = null
  loading.value = true
  try {
    const point = await locateParcelById(parts)
    if (!point) {
      error.value = 'Parcelle introuvable.'
      return
    }
    emit('locate', point)
  } catch {
    error.value = 'Recherche de la parcelle impossible, réessayez.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="ec-parcel-id-form" novalidate @submit.prevent="onSubmit">
    <div class="fr-input-group" :class="{ 'fr-input-group--error': error }">
      <label class="fr-label" for="ec-parcel-id-input">
        Identifiant de parcelle
        <span class="fr-hint-text">Ex. 34_301_000_000_AS_0136 ou 34301000000AS0136</span>
      </label>
      <div class="ec-parcel-id-form__row">
        <input
          id="ec-parcel-id-input"
          v-model="value"
          class="fr-input"
          :class="{ 'fr-input--error': error }"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? 'ec-parcel-id-error' : undefined"
        />
        <button type="submit" class="fr-btn" :disabled="loading">Afficher</button>
      </div>
      <p v-if="error" id="ec-parcel-id-error" class="fr-error-text">{{ error }}</p>
    </div>
  </form>
</template>

<style scoped>
.ec-parcel-id-form__row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  max-width: 32rem;
}
</style>
