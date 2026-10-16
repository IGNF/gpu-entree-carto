import { createApp, type App } from 'vue'
import EmbedMapViewer from '@/embed/EmbedMapViewer.vue'
import config from '@/lib/config'
import type { StandardViewerParams } from '@/lib/types'
import { bootstrapGpuSiteMapEmbed } from '@/lib/demo/demoConfig'
import {
  bootstrapMapPermalinkFromLocation,
  locationHashLooksLikeMapPermalink,
} from '@/lib/map/mapPermalink'
import { scheduleFicheLoadForCherryWhenReady } from '@/lib/fiche/ficheInfoService'
import { ensureEmbedSharedStylesheets } from '@/lib/demo/demoExternalAssets'
import { registerVueDsfrComponents } from '@/lib/vue/registerVueDsfrComponents'
import '@gouvminint/vue-dsfr/styles'

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
  if (params?.document) {
    config.document = params.document
  }
  if (typeof window !== 'undefined' && locationHashLooksLikeMapPermalink()) {
    bootstrapMapPermalinkFromLocation()
  }
  void ensureEmbedSharedStylesheets()
  embedApp = createApp(EmbedMapViewer, { params })
  registerVueDsfrComponents(embedApp)
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
