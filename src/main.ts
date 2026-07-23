import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvminint/vue-dsfr/styles'
import VueDsfr from '@gouvminint/vue-dsfr'

import App from './App.vue'
import DemoView from './views/DemoView.vue'
import './styles/main.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'demo', component: DemoView },
  ],
})

createApp(App).use(router).use(VueDsfr).mount('#app')
