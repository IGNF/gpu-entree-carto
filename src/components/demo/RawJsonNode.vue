<script setup lang="ts">
/**
 * Nœud de l’arbre des données brutes (démo fiche info) : repliable, champs non lus par la fiche grisés.
 * Enfants créés seulement à l’ouverture (géométries : milliers de coordonnées).
 */
import { computed, ref } from 'vue'
import { ficheFieldUsage } from '@/lib/demo/ficheUsedFields'

const MAX_CHILDREN = 200
const MAX_VALUE_CHARS = 160

const props = defineProps<{
  name: string
  value: unknown
  path: string[]
  patterns: readonly string[]
  depth: number
}>()

const usage = computed(() => ficheFieldUsage(props.path, props.patterns))
const isContainer = computed(() => props.value !== null && typeof props.value === 'object')
const entries = computed((): Array<[string, unknown]> =>
  isContainer.value ? Object.entries(props.value as Record<string, unknown>) : [],
)
const summary = computed(() => {
  if (Array.isArray(props.value)) return `[ ${props.value.length} ]`
  return `{ ${entries.value.length} }`
})
const valueText = computed(() => {
  const text = JSON.stringify(props.value) ?? String(props.value)
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…` : text
})
const valueType = computed(() => (props.value === null ? 'null' : typeof props.value))
const open = ref(props.depth === 0 && usage.value !== 'unused')
</script>

<template>
  <li class="ec-raw-node" :class="`ec-raw-node--${usage}`">
    <details
      v-if="isContainer"
      :open="open"
      @toggle="open = ($event.target as HTMLDetailsElement).open"
    >
      <summary>
        <span class="ec-raw-node__key">{{ name }}</span>
        <span class="ec-raw-node__summary">{{ summary }}</span>
      </summary>
      <ul v-if="open" class="ec-raw-node__children">
        <RawJsonNode
          v-for="[key, child] in entries.slice(0, MAX_CHILDREN)"
          :key="key"
          :name="key"
          :value="child"
          :path="[...path, key]"
          :patterns="patterns"
          :depth="depth + 1"
        />
        <li v-if="entries.length > MAX_CHILDREN" class="ec-raw-node__more">
          … {{ entries.length - MAX_CHILDREN }} élément(s) de plus
        </li>
      </ul>
    </details>
    <template v-else>
      <span class="ec-raw-node__key">{{ name }}</span>
      <span class="ec-raw-node__sep">:</span>
      <span class="ec-raw-node__value" :class="`ec-raw-node__value--${valueType}`">{{
        valueText
      }}</span>
    </template>
  </li>
</template>
