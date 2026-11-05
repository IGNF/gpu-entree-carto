<script setup lang="ts">
defineProps<{
  percent: number
  detail: string
}>()
</script>

<template>
  <div class="print-export-progress" role="status" aria-live="polite" aria-busy="true">
    <p class="print-export-progress__title fr-text--md fr-mb-2w">Traitement en cours…</p>
    <div
      class="print-export-progress__bar"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="`${percent} % — ${detail}`"
    >
      <div class="print-export-progress__bar-fill" :style="{ width: `${percent}%` }" />
    </div>
    <p class="print-export-progress__detail fr-text--sm fr-mt-2w">{{ detail }}</p>
    <p class="print-export-progress__percent fr-text--xs fr-mt-1w">{{ percent }} %</p>
  </div>
</template>

<style scoped>
.print-export-progress {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.92);
}

.print-export-progress__title {
  text-align: center;
  margin: 0;
}

.print-export-progress__bar {
  height: 0.5rem;
  border-radius: 0.25rem;
  background: var(--background-contrast-grey, #eee);
  overflow: hidden;
}

.print-export-progress__bar-fill {
  height: 100%;
  background: var(--background-action-high-blue-france, #000091);
  transition: width 0.2s ease;
}

.print-export-progress__detail {
  text-align: center;
  margin: 0;
  color: var(--text-mention-grey, #666);
}

.print-export-progress__percent {
  text-align: center;
  margin: 0;
  color: var(--text-mention-grey, #666);
}
</style>
