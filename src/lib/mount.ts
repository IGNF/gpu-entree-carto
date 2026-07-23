import { createApp, type App } from 'vue'
import EmbedMapViewer from '@/embed/EmbedMapViewer.vue'
import type { StandardViewerParams } from '@/lib/types'

let embedApp: App | null = null

export interface MountedViewer {
  destroy: () => void
}

export function mountMapViewer(
  container: HTMLElement,
  params?: StandardViewerParams,
): MountedViewer {
  if (embedApp) {
    embedApp.unmount()
    embedApp = null
  }

  container.innerHTML = ''
  embedApp = createApp(EmbedMapViewer, { params })
  embedApp.mount(container)

  return {
    destroy() {
      embedApp?.unmount()
      embedApp = null
      container.innerHTML = ''
    },
  }
}

export function unmountMapViewer(): void {
  embedApp?.unmount()
  embedApp = null
}
