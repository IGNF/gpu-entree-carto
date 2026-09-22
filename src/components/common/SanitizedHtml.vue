<script setup lang="ts">
/* eslint-disable vue/no-v-html -- seul point d’injection HTML ; contenu assaini par DOMPurify */
import { computed } from 'vue'
import DOMPurify from 'dompurify'

const props = defineProps<{
  html: string
}>()

const safeHtml = computed(() => DOMPurify.sanitize(props.html))
</script>

<template>
  <div v-bind="$attrs" v-html="safeHtml" />
</template>
