import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import type Map from 'ol/Map'
import type { TreeLayerNode } from '@/types/treeLayerNode'
import { getDemoConfig, resolveDemoBaseLayerId, resolveDemoLayerNodes } from '@/lib/demo/demoConfig'
import { markGpuClientConfigLoading } from '@/lib/demo/gpuClientConfigState'
import { gpuWmsLayerRegistry } from '@/lib/layerConfig/gpuWmsLayers'
import { resolveLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import {
  createGpuBaseLayerEnvironment,
  setActiveGpuBaseLayer,
  type GpuBaseLayerId,
} from '@/ol/gpuBaseLayerPresets'

/**
 * Fonds de plan + catalogue de couches de la configuration gpu-site pour une carte de démo
 * (même catalogue que la carte principale) : arbre, registre WMS, branchement sur la carte.
 * `applyLayerNodes()` après `prepareDemoEnvironment()` (script gpu-client-config chargé).
 */
export function useDemoLayerCatalog(mapRef: Ref<Map | null>) {
  const demoCfg = getDemoConfig()
  const gpuBaseEnv = createGpuBaseLayerEnvironment()
  const basePresets = gpuBaseEnv.presets
  const activeBase = ref<GpuBaseLayerId>(resolveDemoBaseLayerId(demoCfg))
  if (basePresets.some((p) => p.id === activeBase.value)) {
    setActiveGpuBaseLayer(gpuBaseEnv, activeBase.value)
  }
  const mapLayers = computed(() => gpuBaseEnv.allLayers)

  const expectsRemoteLayerConfig = Boolean(demoCfg.configScriptUrl?.trim())
  if (expectsRemoteLayerConfig) markGpuClientConfigLoading()
  const layerNodes = ref<TreeLayerNode[]>(
    expectsRemoteLayerConfig ? [] : resolveDemoLayerNodes(demoCfg),
  )
  const catalogLayersLoading = ref(expectsRemoteLayerConfig)

  const layerMapHooks = {
    onVisible: (id: string, visible: boolean) => gpuWmsLayerRegistry.setVisible(id, visible),
    onOpacity: (id: string, opacity: number) => gpuWmsLayerRegistry.setOpacity(id, opacity),
    onGrayscale: (id: string, grayscale: boolean) =>
      gpuWmsLayerRegistry.setGrayscale(id, grayscale),
    onStackOrder: (ids: string[]) => gpuWmsLayerRegistry.applyStackOrder(ids),
  }

  function applyLayerNodes(): void {
    catalogLayersLoading.value = false
    layerNodes.value = resolveDemoLayerNodes(getDemoConfig())
  }

  function onUpdateBase(id: GpuBaseLayerId): void {
    activeBase.value = id
    setActiveGpuBaseLayer(gpuBaseEnv, id)
  }

  function onToggleLayer(id: string, visible: boolean): void {
    const find = (nodes: TreeLayerNode[]): TreeLayerNode | undefined => {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children?.length) {
          const hit = find(n.children)
          if (hit) return hit
        }
      }
      return undefined
    }
    const node = find(layerNodes.value)
    if (node) node.visible = visible
  }

  watch(mapRef, (map) => {
    if (map && resolveLayerConfig()?.length) gpuWmsLayerRegistry.attachMap(map)
  })

  onUnmounted(() => {
    gpuWmsLayerRegistry.detachMap()
  })

  return {
    basePresets,
    activeBase,
    mapLayers,
    layerNodes,
    catalogLayersLoading,
    layerMapHooks,
    applyLayerNodes,
    onUpdateBase,
    onToggleLayer,
  }
}
