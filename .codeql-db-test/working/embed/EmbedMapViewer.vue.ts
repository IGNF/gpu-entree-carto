import { computed, ref } from 'vue'
import MapShell from '@/components/map/MapShell.vue'
import ZoomControl from '@/components/map/ZoomControl.vue'
import FullScreenControl from '@/components/map/FullScreenControl.vue'
import ScaleLineControl from '@/components/map/ScaleLineControl.vue'
import SearchEngineControl from '@/components/map/SearchEngineControl.vue'
import OverviewMapControl from '@/components/map/OverviewMapControl.vue'
import TerritoriesControl from '@/components/map/TerritoriesControl.vue'
import SketchControl from '@/components/map/SketchControl.vue'
import TabPanelsControl from '@/components/map/TabPanelsControl.vue'
import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import {
  createGpuBaseLayerEnvironment,
  setActiveGpuBaseLayer,
  type GpuBaseLayerId,
} from '@/ol/gpuBaseLayerPresets'
import type { StandardViewerParams } from '@/lib/types'
import 'ol/ol.css'
import 'geopf-extensions-openlayers/css/Dsfr.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@/styles/map-controls.css'

const props = defineProps<{
  params?: StandardViewerParams
}>()

const gpuBaseEnv = createGpuBaseLayerEnvironment()
const presets = gpuBaseEnv.presets
const activeBase = ref<GpuBaseLayerId>('carte')
setActiveGpuBaseLayer(gpuBaseEnv, activeBase.value)
const baseLayers = computed(() => gpuBaseEnv.allLayers)
const initialSearch = computed(() => props.params?.search ?? null)

/** Stub jusqu’à consommation de layerConfig / legendConfig. */
const layerNodes = ref<TreeLayerNode[]>([])

function onUpdateBase(id: GpuBaseLayerId) {
  activeBase.value = id
  setActiveGpuBaseLayer(gpuBaseEnv, id)
}

function onToggleLayer(id: string, visible: boolean) {
  const node = layerNodes.value.find((n) => n.id === id)
  if (node) node.visible = visible
}
