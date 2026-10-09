import { coerceDisplayString } from '@/lib/coerceDisplayString'
import {
  readLegendConfigArray,
  resolveLegendImageDetailDirectory,
} from '@/lib/layerConfig/gpuLegendItems'
import { ParcelFeatureLabel, type DuCategory } from '@/lib/fiche/parcelFeatureLabel'
import type { ParcelFicheFeature } from '@/lib/fiche/parcelFicheFromGpuApi'

/** Zoom par défaut fiche parcelle (~ 1/5000), comme vue serrée gpu-client. */
export const DEFAULT_PARCEL_FICHE_LEGEND_ZOOM = 17

export type ParcelLegendConfigEntry = {
  name: string
  type?: string
  filter?: string
  filter2?: string
  allowedValues?: string[]
  hasfilter2?: Record<string, string[]>
  other?: boolean
  visibility?: {
    highscale: number[]
    lowscale: number[]
  }
}

function normalizeLayerNameForLegend(layerName: string): string {
  return layerName.replace(/^(dev|qlf|pp|formation)-/, '')
}

export type SupCategory = {
  name?: string
  libelle?: string
  downloadable?: boolean
}

declare global {
  interface Window {
    DU_CATEGORIES?: unknown
    SUP_CATEGORIES?: unknown
  }
}

function readDuCategories(): DuCategory[] {
  const raw = typeof window !== 'undefined' ? window.DU_CATEGORIES : undefined
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is DuCategory =>
    Boolean(item && typeof item === 'object' && 'type' in item && 'code' in item),
  )
}

export function readSupCategories(): SupCategory[] {
  const raw = typeof window !== 'undefined' ? window.SUP_CATEGORIES : undefined
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is SupCategory => Boolean(item && typeof item === 'object'))
}

function readParcelLegendConfig(): ParcelLegendConfigEntry[] {
  const w = typeof window !== 'undefined' ? window : undefined
  return readLegendConfigArray(w?.LEGEND_CONFIG)
}

function layerPrefixFromFeatureId(featureId: string): string {
  const dot = featureId.indexOf('.')
  return dot >= 0 ? featureId.slice(0, dot) : featureId
}

export function getLegendConfigFromFeature(
  feature: ParcelFicheFeature,
  legendConfig: ParcelLegendConfigEntry[],
): ParcelLegendConfigEntry | null {
  const id = feature.id ?? ''
  if (!id) return null
  const layerName = layerPrefixFromFeatureId(id)
  return legendConfig.find((config) => config.name === layerName) ?? null
}

function getSubFilterValue(
  properties: Record<string, unknown>,
  config: ParcelLegendConfigEntry,
  value: string,
): string | null {
  if (!config.filter2 || !config.hasfilter2?.[value]) return null
  const filter2value = properties[config.filter2]
  if (typeof filter2value !== 'string') return null
  const allowed = config.hasfilter2[value]
  if (!allowed.includes(filter2value)) return null
  return filter2value.replace(/[^0-9A-Za-z\-_]+/g, '-')
}

function getScalePart(config: ParcelLegendConfigEntry, zoom: number): string {
  if (!config.visibility) return ''
  if (zoom >= (config.visibility.highscale[0] ?? 16)) return '-highscale'
  return '-lowscale'
}

function getScotImage(layer: string, properties: Record<string, unknown>): string {
  if (properties.gpu_id != null) return `${layer}/SCOT_PUBLISHED.png`
  if (properties.approved != null) return `${layer}/SCOT_NOT_PUBLISHED.png`
  return `${layer}/SCOT_PERIMETER.png`
}

function getMecImage(layer: string): string {
  return `${layer}/MEC.png`
}

function getUnavailableImage(name: string, config: ParcelLegendConfigEntry): string | null {
  if (config.other) return `${name}/other.png`
  return null
}

/** Chemin relatif `couche/REGLE[-sous][-scale].png` — aligné gpu-client `ParcelLegend#getLegendImageName`. */
export function getParcelLegendImageRelativePath(
  config: ParcelLegendConfigEntry,
  feature: ParcelFicheFeature,
  zoom: number,
): string | null {
  const properties = feature.properties ?? {}
  const layer = normalizeLayerNameForLegend(config.name)

  if (config.name === 'scot') {
    return getScotImage(layer, properties)
  }
  if (config.name === 'mec') {
    return getMecImage(layer)
  }

  const filterKey = config.filter
  if (!filterKey) return getUnavailableImage(layer, config)
  const value = coerceDisplayString(properties[filterKey]).trim()
  if (!value) {
    return getUnavailableImage(layer, config)
  }
  const allowed = (config.allowedValues ?? []).map((item) => String(item).toUpperCase())
  const upper = value.toUpperCase()
  if (!allowed.includes(upper)) {
    return getUnavailableImage(layer, config)
  }

  let legend = `${layer}/${upper}`
  if (config.filter2 && config.hasfilter2?.[upper]) {
    const filter2value = getSubFilterValue(properties, config, upper)
    if (filter2value) legend += `-${filter2value}`
  }
  legend += getScalePart(config, zoom)
  return `${legend}.png`
}

export function resolveParcelFeatureLegendImageUrl(
  feature: ParcelFicheFeature,
  zoom = DEFAULT_PARCEL_FICHE_LEGEND_ZOOM,
): string | null {
  const legendConfig = readParcelLegendConfig()
  const config = getLegendConfigFromFeature(feature, legendConfig)
  if (!config || config.type === 'lowscale') return null
  const relative = getParcelLegendImageRelativePath(config, feature, zoom)
  if (!relative) return null
  const base = resolveLegendImageDetailDirectory()
  if (!base) return null
  return `${base}${relative}`
}

export function createParcelFeatureLabel(): ParcelFeatureLabel {
  return new ParcelFeatureLabel(readDuCategories())
}

export function getSupLabelFromProperties(
  properties: Record<string, unknown>,
  supCategories: SupCategory[],
): string {
  const suptype = properties.suptype
  if (typeof suptype !== 'string' || !suptype) return 'SUP'
  const category = supCategories.find(
    (c) => c.name && suptype.toUpperCase() === c.name.toUpperCase(),
  )
  if (!category) return suptype.toUpperCase()
  const parts: string[] = []
  if (category.libelle) parts.push(category.libelle)
  if (category.name) parts.push(`(${category.name})`)
  return parts.join(' ')
}
