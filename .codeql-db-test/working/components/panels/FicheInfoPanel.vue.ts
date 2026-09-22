/**
 * Contenu onglet 1 — fiche info / localisation.
 */
import { computed } from 'vue'
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import { DEFAULT_FICHE_EMPTY, type FicheInfoSelection } from '@/composables/tabPanels'
import RawInfoPanel from '@/components/panels/RawInfoPanel.vue'

const props = defineProps<{
  selection: FicheInfoSelection | null
}>()

const title = computed(() => props.selection?.title ?? DEFAULT_FICHE_EMPTY.title)
const bodyHtml = computed(() => props.selection?.bodyHtml ?? DEFAULT_FICHE_EMPTY.bodyHtml)
