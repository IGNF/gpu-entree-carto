import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import type BaseLayer from 'ol/layer/Base'
import {
  createLimitDepartmentalLayer,
  createLimitRegionalLayer,
  preloadLimitGeoJson,
} from '@/ol/gpuLimitOverlayLayers'
import type { GpuBaseLayerThumbnailWmts } from '@/ol/gpuBaseLayerThumbnails'
import { ignGeoportalAttributions } from '@/ol/ignGeoportalAttributions'
import '@/styles/gpu-base-layers.css'

export {
  GPU_TILE_LAYER_SWITCHER_TILE_COORD,
  GPU_PREVIEW_TILE_RESOLUTION,
} from '@/ol/gpuBaseLayerThumbnails'

/** Frontière zoom cadastre bas / haut (gpu-client zoom 17). */
const RES_ZOOM_17 = 156543.03392804097 / 2 ** 17

const WMTS_CACHE_SIZE = 256

/** Métadonnées vignette WMTS par clé `mainLayers` (absent = pas de tuile d’aperçu). */
const THUMBNAIL_BY_MAIN_KEY: Record<GpuMainLayerKey, GpuBaseLayerThumbnailWmts | null> = {
  cadastreLow: {
    layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
    style: 'PCI vecteur',
    maxResolution: RES_ZOOM_17,
  },
  cadastreHigh: {
    layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
    style: 'PCI vecteur',
    minResolution: RES_ZOOM_17,
  },
  planign: { layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' },
  planignGris: { layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', grayscale: true },
  ortho: { layer: 'ORTHOIMAGERY.ORTHOPHOTOS', format: 'jpeg' },
  names: { layer: 'GEOGRAPHICALNAMES.NAMES' },
  roads: { layer: 'TRANSPORTNETWORKS.ROADS' },
  limitesAdmin: { layer: 'LIMITES_ADMINISTRATIVES_EXPRESS.LATEST' },
  limitRegional: null,
  limitDepartmental: null,
  blank: null,
}

export type GpuBaseLayerId = 'carte' | 'carte-nb' | 'photo' | 'mixte' | 'cadastre' | 'blank'

export type GpuMainLayerKey =
  | 'cadastreLow'
  | 'cadastreHigh'
  | 'planign'
  | 'planignGris'
  | 'ortho'
  | 'names'
  | 'roads'
  | 'limitesAdmin'
  | 'limitRegional'
  | 'limitDepartmental'
  | 'blank'

export interface GpuBaseLayerPreset {
  id: GpuBaseLayerId
  label: string
  subtitle: string
  description: string
  /** Pile unique (gpu-client `addTile`) — source pour `layerKeys` et `thumbnailLayers`. */
  stack: GpuMainLayerKey[]
  thumbnailLayers: GpuBaseLayerThumbnailWmts[]
  /** @deprecated Alias de `stack` — clés du pool `mainLayers`. */
  layerKeys: GpuMainLayerKey[]
}

interface GpuBaseLayerPresetInput {
  id: GpuBaseLayerId
  label: string
  subtitle: string
  description: string
  stack: GpuMainLayerKey[]
}

function buildPreset(input: GpuBaseLayerPresetInput): GpuBaseLayerPreset {
  const thumbnailLayers = input.stack
    .map((key) => THUMBNAIL_BY_MAIN_KEY[key])
    .filter((t): t is GpuBaseLayerThumbnailWmts => t != null)
  return {
    ...input,
    thumbnailLayers,
    layerKeys: input.stack,
  }
}

export interface GpuBaseLayerEnvironment {
  presets: GpuBaseLayerPreset[]
  mainLayers: Record<GpuMainLayerKey, BaseLayer>
  allLayers: BaseLayer[]
}

function wmtsLayer(
  layer: string,
  format: 'png' | 'jpeg' = 'png',
  options?: {
    grayscale?: boolean
    style?: string
    minResolution?: number
    maxResolution?: number
  },
): TileLayer {
  const style = options?.style ?? 'normal'
  const tileLayer = new TileLayer({
    visible: false,
    className: options?.grayscale ? 'ec-gpu-layer-grayscale' : undefined,
    minResolution: options?.minResolution,
    maxResolution: options?.maxResolution,
    source: new XYZ({
      url:
        `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
        `&LAYER=${encodeURIComponent(layer)}&STYLE=${encodeURIComponent(style)}&FORMAT=image/${format}` +
        `&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`,
      attributions: () => ignGeoportalAttributions(),
      attributionsCollapsible: false,
      crossOrigin: 'anonymous',
      maxZoom: 19,
      cacheSize: WMTS_CACHE_SIZE,
    }),
  })

  if (options?.grayscale) {
    tileLayer.set('grayscale', true)
  }

  return tileLayer
}

function createMainLayerPool(): Record<GpuMainLayerKey, BaseLayer> {
  return {
    cadastreLow: wmtsLayer('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'png', {
      style: 'PCI vecteur',
      maxResolution: RES_ZOOM_17,
    }),
    cadastreHigh: wmtsLayer('CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'png', {
      style: 'PCI vecteur',
      minResolution: RES_ZOOM_17,
    }),
    planign: wmtsLayer('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'),
    planignGris: wmtsLayer('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'png', { grayscale: true }),
    ortho: wmtsLayer('ORTHOIMAGERY.ORTHOPHOTOS', 'jpeg'),
    names: wmtsLayer('GEOGRAPHICALNAMES.NAMES'),
    roads: wmtsLayer('TRANSPORTNETWORKS.ROADS'),
    limitesAdmin: wmtsLayer('LIMITES_ADMINISTRATIVES_EXPRESS.LATEST'),
    limitRegional: createLimitRegionalLayer(),
    limitDepartmental: createLimitDepartmentalLayer(),
    blank: new VectorLayer({
      visible: false,
      source: new VectorSource(),
      background: '#ffffff',
    }),
  }
}

/** Limites administratives vectorielles — suffixe gpu-client sur chaque tuile. */
const LIMIT_STACK: GpuMainLayerKey[] = ['limitRegional', 'limitDepartmental']

const PRESET_INPUTS: GpuBaseLayerPresetInput[] = [
  {
    id: 'carte',
    label: 'Plan IGN',
    subtitle: 'Plan IGN — WMTS',
    description:
      'Cartographie multi-échelles sur le territoire national, issue de bases de données vecteur de l’IGN, mise à jour régulièrement et réalisée selon un processus entièrement automatisé.',
    stack: ['cadastreLow', 'planign', ...LIMIT_STACK],
  },
  {
    id: 'carte-nb',
    label: 'Plan IGN Noir & Blanc',
    subtitle: 'Plan IGN — WMTS',
    description:
      'Cartographie multi-échelles sur le territoire national, issue de bases de données vecteur de l’IGN, mise à jour régulièrement et réalisée selon un processus entièrement automatisé en niveaux de gris.',
    stack: ['cadastreLow', 'planignGris', ...LIMIT_STACK],
  },
  {
    id: 'photo',
    label: 'Photographies aériennes',
    subtitle: 'Orthophotos — WMTS',
    description:
      'Photographies aériennes. Date de prise de vue aérienne disponible via cet url: <a target="_blank" href="https://data.geopf.fr/annexes/ressources/fiches/photographies-aeriennes-RVB/geoportail_dates_des_prises_de_vues_aeriennes-RVB.pdf">https://data.geopf.fr/annexes/ressources/fiches/photographies-aeriennes-RVB/geoportail_dates_des_prises_de_vues_aeriennes-RVB.pdf</a>',
    stack: ['cadastreLow', 'ortho', ...LIMIT_STACK],
  },
  {
    id: 'mixte',
    label: 'Mixte',
    subtitle: 'Orthophotos + Routes - WMTS',
    description: 'Combinaison de photographies aériennes et de réseaux de transports.',
    stack: ['cadastreLow', 'ortho', 'names', 'roads', 'limitesAdmin', ...LIMIT_STACK],
  },
  {
    id: 'cadastre',
    label: 'Cadastre',
    subtitle: 'Parcellaire cadastral édition : 2026-06-01 — WMTS Géoplateforme',
    description:
      '<br>Métadonnées<br><a target="_blank" href="https://data.geopf.fr/csw?REQUEST=GetRecordById&amp;SERVICE=CSW&amp;VERSION=2.0.2&amp;OUTPUTSCHEMA=http://standards.iso.org/iso/19115/-3/mdb/2.0&amp;elementSetName=full&amp;ID=IGNF_PARCELLAIRE-EXPRESS-PCI">https://data.geopf.fr/csw?REQUEST=GetRecordById&amp;SERVICE=CSW&amp;VERSION=2.0.2&amp;OUTPUTSCHEMA=http://standards.iso.org/iso/19115/-3/mdb/2.0&amp;elementSetName=full&amp;ID=IGNF_PARCELLAIRE-EXPRESS-PCI</a><br><a target="_blank"href="https://cartes.gouv.fr/catalogue/dataset/IGNF_PARCELLAIRE-EXPRESS-PCI">https://cartes.gouv.fr/catalogue/dataset/IGNF_PARCELLAIRE-EXPRESS-PCI</a><br><a target="_blank" href="https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_PARCELLAIRE-EXPRESS-PCI">https://cartes.gouv.fr/rechercher-une-donnee/dataset/IGNF_PARCELLAIRE-EXPRESS-PCI</a><br><br>Légende<br><a class="fr-link" href="https://data.geopf.fr/annexes/ressources/legendes/CADASTRALPARCELS.PARCELLAIRE_EXPRESS.png" target="_blank">Du 1/0 au 1/560000000</a><br><a class="fr-link" href="https://data.geopf.fr/annexes/ressources/legendes/CADASTRALPARCELS.PARCELLAIRE_EXPRESS-legend.png" target="_blank">Du 1/1000 au 1/560000000</a>',
    stack: ['cadastreLow', 'cadastreHigh', ...LIMIT_STACK],
  },
  {
    id: 'blank',
    label: 'Fond blanc',
    subtitle: 'Couche vectorielle vide',
    description: 'Aucun fond cartographique : met en avant uniquement les couches de données actives.',
    stack: ['blank'],
  },
]

/**
 * Environnement fonds de plan — une instance OL par couche (comme gpu-client `mainLayers`).
 */
export function createGpuBaseLayerEnvironment(): GpuBaseLayerEnvironment {
  preloadLimitGeoJson()

  const mainLayers = createMainLayerPool()

  const presets = PRESET_INPUTS.map(buildPreset)

  return {
    presets,
    mainLayers,
    allLayers: Object.values(mainLayers),
  }
}

/** @deprecated Préférer `createGpuBaseLayerEnvironment().presets`. */
export function createGpuBaseLayerPresets(): GpuBaseLayerPreset[] {
  return createGpuBaseLayerEnvironment().presets
}

export function setActiveGpuBaseLayer(
  env: GpuBaseLayerEnvironment,
  id: GpuBaseLayerId,
): void {
  for (const layer of env.allLayers) {
    layer.setVisible(false)
  }
  const preset = env.presets.find((p) => p.id === id)
  if (!preset) return
  for (const key of preset.stack) {
    env.mainLayers[key].setVisible(true)
  }
}

export function allGpuBaseOlLayers(env: GpuBaseLayerEnvironment): BaseLayer[] {
  return env.allLayers
}
