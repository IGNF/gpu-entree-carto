import { createApp, type App } from 'vue'
import EmbedMapViewer from '@/embed/EmbedMapViewer.vue'
import type { StandardViewerParams } from '@/lib/types'
import { bootstrapGpuSiteMapEmbed } from '@/lib/demo/demoConfig'
import {
  bootstrapMapPermalinkFromLocation,
  locationHashLooksLikeMapPermalink,
} from '@/lib/map/mapPermalink'
import { scheduleFicheLoadForCherryWhenReady } from '@/lib/fiche/ficheInfoService'

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
  if (typeof window !== 'undefined' && locationHashLooksLikeMapPermalink()) {
    bootstrapMapPermalinkFromLocation()
  }
  embedApp = createApp(EmbedMapViewer, { params })
  embedApp.mount(container)

  queueMicrotask(() => {
    bootstrapGpuSiteMapEmbed()
    scheduleFicheLoadForCherryWhenReady()
  })

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
