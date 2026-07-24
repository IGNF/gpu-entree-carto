import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@gouvfr/dsfr/dist/dsfr.min.css'
/* Pictos Remix / DSFR (`fr-icon-*`) — absents de dsfr.min.css seul */
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvminint/vue-dsfr/styles'
import VueDsfr from '@gouvminint/vue-dsfr'

import App from './App.vue'
import HomeView from './views/HomeView.vue'
import DemoView from './views/DemoView.vue'
import GeometryEditorView from './views/GeometryEditorView.vue'
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
  ],
})

createApp(App).use(router).use(VueDsfr).mount('#app')
