/**
 * Page d’accueil démo (équivalent banner gpu-site) :
 * SearchEngineAdvanced hors carte → /map via handoff mémoire + router (SPA).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mountSearchEngine, type MountedSearchEngine } from '@/lib/mountSearchEngine'
import { prepareLocationHandoff } from '@/lib/search/locationSearch'
import type { AutocompleteLocation } from '@/lib/types'
import { getDemoConfig } from '@/lib/demo/demoConfig'

const router = useRouter()
const searchHost = ref<HTMLElement | null>(null)
let mounted: MountedSearchEngine | null = null

onMounted(() => {
  if (!searchHost.value) return
  const demo = getDemoConfig()
  mounted = mountSearchEngine(searchHost.value, {
    mode: 'emit',
    placeholder: demo.home?.searchPlaceholder ?? 'Rechercher une adresse, une ville, un lieu...',
    onSelect: (location: AutocompleteLocation) => {
      prepareLocationHandoff(location)
      void router.push({ name: 'map' })
    },
  })
})

onBeforeUnmount(() => {
  mounted?.destroy()
  mounted = null
})
