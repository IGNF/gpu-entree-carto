import { createApp, type Component } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@gouvfr/dsfr/dist/dsfr.min.css'
/* Pictos Remix / DSFR (`fr-icon-*`) — absents de dsfr.min.css seul */
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvminint/vue-dsfr/styles'
import * as VueDsfrExports from '@gouvminint/vue-dsfr'

import App from './App.vue'
import HomeView from './views/HomeView.vue'
import DemoView from './views/DemoView.vue'
import GeometryEditorView from './views/GeometryEditorView.vue'
import SketchDemoView from './views/SketchDemoView.vue'
import './styles/main.css'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/map', name: 'map', component: DemoView },
    {
      path: '/geometry-editor',
      name: 'geometry-editor',
      component: GeometryEditorView,
    },
    {
      path: '/sketch',
      name: 'sketch',
      component: SketchDemoView,
    },
  ],
})

const app = createApp(App)
app.use(router)

/*
 * Enregistrement manuel des composants vue-dsfr :
 * - le plugin filtre via `component.name`, or les builds n’ont que `__name`
 *   → rien n’était enregistré (DsfrAccordion introuvable) ;
 * - le plugin enregistre aussi VIcon deux fois → warning.
 */
for (const [name, comp] of Object.entries(VueDsfrExports)) {
  if (!name.startsWith('Dsfr') || comp == null || typeof comp !== 'object') {
    continue
  }
  app.component(name, comp as Component)
}
if (VueDsfrExports.VIcon) {
  app.component('VIcon', VueDsfrExports.VIcon as Component)
}

app.mount('#app')
