import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@gouvfr/dsfr/dist/dsfr.min.css'
/* Pictos Remix / DSFR (`fr-icon-*`) — absents de dsfr.min.css seul */
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvminint/vue-dsfr/styles'
import VueDsfr, * as VueDsfrExports from '@gouvminint/vue-dsfr'

import App from './App.vue'
import HomeView from './views/HomeView.vue'
import DemoView from './views/DemoView.vue'
import GeometryEditorView from './views/GeometryEditorView.vue'
import SketchDemoView from './views/SketchDemoView.vue'
import './styles/main.css'

const router = createRouter({
  history: createWebHistory(),
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

/*
 * vue-dsfr enregistre VIcon dans la boucle des composants puis une 2ᵉ fois
 * explicitement → warning « already been registered ». On passe seulement les
 * Dsfr* ; VIcon est enregistré une seule fois par le plugin.
 */
const dsfrComponents = Object.entries(VueDsfrExports)
  .filter(([name, value]) => name.startsWith('Dsfr') && value != null)
  .map(([, value]) => value as { name?: string })

createApp(App).use(router).use(VueDsfr, { components: dsfrComponents }).mount('#app')
