<script setup lang="ts">
import type { CadastreReferences } from '@/lib/fiche/ficheCadastreReferences'

defineProps<{
  open: boolean
  references: CadastreReferences | null
}>()

const emit = defineEmits<{
  close: []
}>()

async function copyHeadline(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <dialog
    v-if="open"
    class="ec-fiche-cadastre-modal"
    open
    aria-labelledby="ec-fiche-cadastre-modal-title"
    @cancel.prevent="emit('close')"
    @click.self="emit('close')"
  >
    <div class="ec-fiche-cadastre-modal__panel">
      <header class="ec-fiche-cadastre-modal__header">
        <h2 id="ec-fiche-cadastre-modal-title" class="ec-fiche-cadastre-modal__title">
          <span class="fr-icon-information-line" aria-hidden="true" />
          Références cadastrales
        </h2>
        <button
          type="button"
          class="ec-fiche-cadastre-modal__close fr-btn fr-btn--tertiary"
          @click="emit('close')"
        >
          Fermer
          <span class="fr-icon-close-line" aria-hidden="true" />
        </button>
      </header>

      <div v-if="references" class="ec-fiche-cadastre-modal__body">
        <div class="ec-fiche-cadastre-modal__headline-row">
          <p class="ec-fiche-cadastre-modal__headline">{{ references.headline }}</p>
          <button
            type="button"
            class="ec-fiche-cadastre-modal__copy fr-btn fr-btn--tertiary fr-btn--icon-left"
            title="Copier l’identifiant"
            @click="copyHeadline(references.headline)"
          >
            <span class="ri-file-copy-line" aria-hidden="true" />
            <span class="visually-hidden">Copier</span>
          </button>
        </div>
        <dl class="ec-fiche-cadastre-modal__dl">
          <template v-for="row in references.rows" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </template>
        </dl>
      </div>
    </div>
  </dialog>
</template>
