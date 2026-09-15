import type { TreeLayerNode } from '@/components/layers/TreeLayerSwitcher.vue'
import { layerConfigToTreeNodes } from '@/lib/layerConfig/layerConfigToTree'
import { readLayerConfigFromWindow } from '@/lib/layerConfig/gpuLayerConfig'
import type { GpuBaseLayerId } from '@/ol/gpuBaseLayerPresets'
import config from '@/lib/config'
import type { StandardViewerDocument, StandardViewerSearch } from '@/lib/types'
import type Map from 'ol/Map'
import { transformExtent } from 'ol/proj'

const LOG_PREFIX = '[entree-carto/demo-config]'

export interface DemoMapConfig {
  /** Id preset gpu (`carte`, …) ou anciens alias démo `plan` | `ortho` | `blank`. */
  baseLayerId?: GpuBaseLayerId | 'plan' | 'ortho' | 'blank'
  zoom?: number
  layerNodes?: TreeLayerNode[]
  search?: StandardViewerSearch | null
}

export interface DemoHomeConfig {
  searchPlaceholder?: string
}

export interface DemoConfig {
  configScriptUrl?: string | null
  document?: StandardViewerDocument | null
  bbox?: number[] | null
  gpuConfigOverrides?: Record<string, unknown>
  map?: DemoMapConfig
  home?: DemoHomeConfig
}

const DEFAULT_LAYER_NODES: TreeLayerNode[] = [
  {
    id: 'demo-plu',
    title: 'Document d’urbanisme (exemple)',
    visible: true,
    legend: [{ id: 'demo-plu-leg', title: 'Zonage PLU (exemple)' }],
  },
  {
    id: 'demo-sup',
    title: 'Servitude (exemple)',
    visible: false,
    legend: [{ id: 'demo-sup-leg', title: 'Servitude (exemple)' }],
  },
]

const DEFAULT_DEMO_CONFIG: DemoConfig = {
  configScriptUrl: null,
  document: null,
  bbox: null,
  gpuConfigOverrides: {},
  map: {
    baseLayerId: 'carte',
    zoom: 6,
    layerNodes: DEFAULT_LAYER_NODES,
    search: null,
  },
  home: {
    searchPlaceholder: 'Rechercher une adresse, une ville, un lieu...',
  },
}

declare global {
  interface Window {
    DEMO_CONFIG?: DemoConfig
    /** Globals injectés par gpu-client-config.js */
    LAYER_CONFIG?: unknown
    LEGEND_CONFIG?: unknown
    LEGEND_REFERENCES?: unknown
  }
}

const GPU_BASE_LAYER_IDS = new Set<GpuBaseLayerId>([
  'carte',
  'carte-nb',
  'photo',
  'mixte',
  'cadastre',
  'blank',
])

const LEGACY_BASE_LAYER_IDS: Record<'plan' | 'ortho' | 'blank', GpuBaseLayerId> = {
  plan: 'carte',
  ortho: 'photo',
  blank: 'blank',
}

/** Fond de plan au chargement (Plan IGN = `carte` par défaut). */
export function resolveDemoBaseLayerId(cfg: DemoConfig): GpuBaseLayerId {
  const raw = cfg.map?.baseLayerId ?? 'carte'
  if (GPU_BASE_LAYER_IDS.has(raw as GpuBaseLayerId)) {
    return raw as GpuBaseLayerId
  }
  return LEGACY_BASE_LAYER_IDS[raw as keyof typeof LEGACY_BASE_LAYER_IDS] ?? 'carte'
}

export function getDemoConfig(): DemoConfig {
  const raw = typeof window !== 'undefined' ? window.DEMO_CONFIG : undefined
  return mergeDemoConfig(DEFAULT_DEMO_CONFIG, raw ?? {})
}

function mergeDemoConfig(base: DemoConfig, patch: DemoConfig): DemoConfig {
  return {
    ...base,
    ...patch,
    gpuConfigOverrides: { ...base.gpuConfigOverrides, ...patch.gpuConfigOverrides },
    map: {
      ...base.map,
      ...patch.map,
      layerNodes: patch.map?.layerNodes ?? base.map?.layerNodes,
    },
    home: { ...base.home, ...patch.home },
  }
}

export function applyGpuConfigOverrides(overrides: Record<string, unknown> | undefined): void {
  if (!overrides || !Object.keys(overrides).length) return
  Object.assign(config, overrides)
  const w = window as Window & { gpu?: { config?: Record<string, unknown> } }
  if (w.gpu?.config) {
    Object.assign(w.gpu.config, overrides)
  }
}

export function loadGpuClientConfigScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-ec-demo-config="${url}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.dataset.ecDemoConfig = url
    script.id = 'gpu-client-config'
    script.src = url
    script.onload = () => {
      console.info(`${LOG_PREFIX} gpu-client-config chargé`, url)
      resolve()
    }
    script.onerror = () => {
      console.error(`${LOG_PREFIX} échec chargement`, url)
      reject(new Error(`Impossible de charger ${url}`))
    }
    document.body.appendChild(script)
  })
}

export async function prepareDemoEnvironment(cfg: DemoConfig = getDemoConfig()): Promise<DemoConfig> {
  applyGpuConfigOverrides(cfg.gpuConfigOverrides)
  const url = cfg.configScriptUrl?.trim()
  if (url) {
    try {
      await loadGpuClientConfigScript(url)
      const w = window as Window & { gpu?: { config?: Record<string, unknown> } }
      if (w.gpu?.config) {
        Object.assign(config, w.gpu.config)
      }
    } catch {
      /* démo utilisable avec layerNodes locaux */
    }
  }
  return cfg
}

export function resolveDemoLayerNodes(cfg: DemoConfig): TreeLayerNode[] {
  const fromGpu = readLayerConfigFromWindow()
  if (fromGpu?.length) {
    return layerConfigToTreeNodes(fromGpu)
  }
  const nodes = cfg.map?.layerNodes
  if (Array.isArray(nodes) && nodes.length) {
    return nodes.map((n) => ({
      id: String(n.id),
      title: String(n.title),
      visible: Boolean(n.visible),
      legend: n.legend,
      children: n.children,
    }))
  }
  return DEFAULT_LAYER_NODES.map((n) => ({ ...n, legend: n.legend ? [...n.legend] : undefined }))
}

export function isValidBbox(bbox: unknown): bbox is [number, number, number, number] {
  return (
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((v) => typeof v === 'number' && Number.isFinite(v))
  )
}

export function fitMapToBbox(map: Map, bbox: number[], padding = 48): void {
  if (!isValidBbox(bbox)) return
  const extent = transformExtent(bbox, 'EPSG:4326', 'EPSG:3857')
  map.getView().fit(extent, { padding: [padding, padding, padding, padding], maxZoom: 18 })
}

export function documentToFicheSelection(doc: StandardViewerDocument): {
  title: string
  bodyHtml: string
  raw: Record<string, unknown>
} {
  const title = doc.name ?? doc.id ?? 'Document'
  const lines = [
    doc.type ? `<p><strong>Type :</strong> ${doc.type}</p>` : '',
    doc.status ? `<p><strong>Statut :</strong> ${doc.status}</p>` : '',
    doc.id ? `<p><strong>Identifiant :</strong> ${doc.id}</p>` : '',
    doc.bbox ? `<p><strong>Emprise :</strong> ${doc.bbox}</p>` : '',
  ].filter(Boolean)
  return {
    title,
    bodyHtml: lines.length ? lines.join('') : '<p>Document configuré dans demo-config.js</p>',
    raw: { ...doc },
  }
}
