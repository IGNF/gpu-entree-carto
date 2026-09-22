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
