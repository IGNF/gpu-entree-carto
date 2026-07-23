import { createApp, type App } from 'vue'
import LocationSearchWidget from '@/components/search/LocationSearchWidget.vue'
import type { AutocompleteLocation } from '@/lib/types'

export interface MountLocationSearchOptions {
  /** redirect (défaut) : POST/GET vers mapUrl ; emit : callback seul. */
  mode?: 'redirect' | 'emit'
  mapUrl?: string
  method?: 'GET' | 'POST'
  label?: string
  placeholder?: string
  maximumResponses?: number
  initialQuery?: string
  onSelect?: (location: AutocompleteLocation) => void
}

export interface MountedLocationSearch {
  destroy: () => void
}

/**
 * Monte le widget de recherche de lieu hors carte (page d’accueil gpu-site).
 */
export function mountLocationSearch(
  container: HTMLElement,
  options: MountLocationSearchOptions = {},
): MountedLocationSearch {
  container.innerHTML = ''

  const app: App = createApp(LocationSearchWidget, {
    mode: options.mode ?? 'redirect',
    mapUrl: options.mapUrl ?? '/map/',
    method: options.method ?? 'POST',
    label: options.label,
    placeholder: options.placeholder,
    maximumResponses: options.maximumResponses,
    initialQuery: options.initialQuery ?? '',
    // Listener Vue 3 pour emit('select')
    onSelect: (location: AutocompleteLocation) => {
      options.onSelect?.(location)
    },
  })

  app.mount(container)

  return {
    destroy() {
      app.unmount()
      container.innerHTML = ''
    },
  }
}
