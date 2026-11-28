<script setup lang="ts">
/** Roue de patience + message, annoncé aux lecteurs d’écran (attente de données). */
defineProps<{ label: string }>()
</script>

<template>
  <div class="ec-loading-status" role="status" aria-live="polite">
    <span class="ri-loader-4-line ec-loading-status__spinner" aria-hidden="true" />
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.ec-loading-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-mention-grey, #666);
}

.ec-loading-status__spinner {
  flex: 0 0 auto;
  font-size: 1.125rem;
  color: var(--text-action-high-blue-france, #000091);
  animation: ec-loading-status-spin 0.9s linear infinite;
}

@keyframes ec-loading-status-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ec-loading-status__spinner {
    animation: none;
  }
}
</style>
