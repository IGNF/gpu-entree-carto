import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createNotivue } from 'notivue'
import 'notivue/notification.css'
import 'notivue/animations.css'
import { startDsfrForVueApp } from '@/lib/demo/dsfrVue'
import '@gouvminint/vue-dsfr/styles'
import { registerVueDsfrComponents } from '@/lib/vue/registerVueDsfrComponents'

import App from './App.vue'
import HomeView from './views/HomeView.vue'
import DemoView from './views/DemoView.vue'
import GeometryEditorView from './views/GeometryEditorView.vue'
import SketchDemoView from './views/SketchDemoView.vue'
import './styles/main.css'
import './styles/location-search-host.css'
import './styles/notifications.css'
import {
  bootstrapMapPermalinkFromLocation,
  locationHashLooksLikeMapPermalink,
} from '@/lib/map/mapPermalink'
import { captureInitialLayerPermalinkFromLocation } from '@/lib/layerConfig/documentCatalogStartup'

if (typeof window !== 'undefined') {
  if (window.location.pathname.replace(/\/+$/, '').endsWith('/map')) {
    captureInitialLayerPermalinkFromLocation()
  }
  if (locationHashLooksLikeMapPermalink()) {
    bootstrapMapPermalinkFromLocation()
  }
}

const notivue = createNotivue({
  position: 'bottom-center',
  limit: 3,
  enqueue: true,
  avoidDuplicates: false,
  notifications: {
    global: {
      duration: 5000,
    },
  },
})

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

router.beforeEach((to) => {
  if (to.name === 'map' && locationHashLooksLikeMapPermalink()) {
    bootstrapMapPermalinkFromLocation()
  }
})

const app = createApp(App)
app.use(router)
app.use(notivue)

registerVueDsfrComponents(app)

app.mount('#app')
startDsfrForVueApp()
