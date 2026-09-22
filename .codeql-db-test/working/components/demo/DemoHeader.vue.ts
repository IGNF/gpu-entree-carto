/**
 * En-tête démo façon gpu-site : logo RF + service + nav Accueil / Carte.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const links = [
  { name: 'home', to: '/', label: 'Accueil' },
  { name: 'map', to: '/map', label: 'Carte' },
  { name: 'geometry-editor', to: '/geometry-editor', label: 'Géométries' },
  { name: 'sketch', to: '/sketch', label: 'Croquis' },
] as const

const isActive = computed(() => (name: string) => {
  return route.name === name
})
