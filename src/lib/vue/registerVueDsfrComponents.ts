import type { App, Component } from 'vue'
import * as VueDsfrExports from '@gouvminint/vue-dsfr'

/** Enregistre les composants Dsfr* (embed gpu-site sans `main.ts`). */
export function registerVueDsfrComponents(app: App): void {
  for (const [name, comp] of Object.entries(VueDsfrExports)) {
    if (!name.startsWith('Dsfr') || comp == null || typeof comp !== 'object') continue
    app.component(name, comp as Component)
  }
  if (VueDsfrExports.VIcon) {
    app.component('VIcon', VueDsfrExports.VIcon as Component)
  }
}
