<script setup lang="ts">
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import type { CadastreReferences } from '@/lib/fiche/ficheCadastreReferences'
import '@/styles/fiche-info.css'
import '@/styles/map-print-supplement.css'

defineProps<{
  title: string
  infosHtml: string
  documentsHtml: string
  cadastreReferences: CadastreReferences | null
}>()
</script>

<template>
  <article class="ec-print-supplement-page ec-print-fiche">
    <h2 class="ec-print-fiche__title">{{ title }}</h2>
    <div class="ec-print-fiche__sections">
      <section v-if="cadastreReferences" class="ec-print-fiche__section">
        <h3 class="ec-print-fiche__section-title">Références cadastrales</h3>
        <p class="ec-print-fiche__cadastre-headline">{{ cadastreReferences.headline }}</p>
        <dl class="ec-print-fiche__cadastre-dl">
          <template v-for="row in cadastreReferences.rows" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </template>
        </dl>
      </section>
      <section class="ec-print-fiche__section">
        <h3 class="ec-print-fiche__section-title">Infos</h3>
        <SanitizedHtml class="ec-fiche-info__body" :html="infosHtml" />
      </section>
      <section class="ec-print-fiche__section">
        <h3 class="ec-print-fiche__section-title">Documents</h3>
        <SanitizedHtml
          class="ec-fiche-info__body"
          :html="documentsHtml || '<p>Aucun document.</p>'"
        />
      </section>
    </div>
  </article>
</template>
