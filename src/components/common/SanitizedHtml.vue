<script setup lang="ts">
/* eslint-disable vue/no-v-html -- seul point d’injection HTML ; contenu assaini par DOMPurify */
import { computed } from 'vue'
import { sanitizeDisplayHtml } from '@/components/common/sanitizedHtmlCore'

const props = defineProps<{
  html: string
  /** Conserve `target="_blank"` sur les liens (DOMPurify le retire par défaut). */
  linkTargetBlank?: boolean
}>()

const safeHtml = computed(() => sanitizeDisplayHtml(props.html, props.linkTargetBlank))
</script>

<template>
  <div v-bind="$attrs" v-html="safeHtml" />
</template>
