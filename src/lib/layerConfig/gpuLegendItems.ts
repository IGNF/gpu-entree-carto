import type { LegendItem } from '@/types/stubs'
import type { GpuLayerConfig } from '@/lib/layerConfig/gpuLayerConfig'
import config from '@/lib/config'

const DEFAULT_SCALE_DEPENDANT_THRESHOLD = 16
const GEOMETRY_TYPES = ['pct', 'lin', 'surf'] as const

export interface LegendConfigEntry {
  name: string
  allowedValues?: string[]
  other?: boolean
  hasfilter2?: Record<string, string[]>
}

export interface LegendReferenceEntry {
  title: string
  type?: string | string[]
  hide?: boolean
  combine?: Record<string, { type: string[] }>
}

export interface GpuLegendBuildOptions {
  legendConfig: LegendConfigEntry[]
  legendReferences: Record<string, Record<string, LegendReferenceEntry>>
  imagePath: string
  zoomAtInit: number
  ancestorLayers: GpuLayerConfig[]
}

function normalizeLayerNameForLegend(layerName: string): string {
  return layerName.replace(/^(dev|qlf|pp|formation)-/, '')
}

function readScaleDependantThreshold(layer: GpuLayerConfig): number | undefined {
  const raw = layer.scaleDependantTreshold
  if (raw === undefined || raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function isLayerScaleDependant(layer: GpuLayerConfig, ancestors: GpuLayerConfig[]): boolean {
  if (layer.scaleDependant) return true
  for (const a of ancestors) {
    if (a.scaleDependant) return true
  }
  return false
}

function getScaleDependantThreshold(layer: GpuLayerConfig, ancestors: GpuLayerConfig[]): number {
  const chain = [layer, ...ancestors]
  for (const item of chain) {
    const t = readScaleDependantThreshold(item)
    if (t !== undefined && !Number.isNaN(t)) return t
  }
  return DEFAULT_SCALE_DEPENDANT_THRESHOLD
}

function isHighScaleZoom(zoom: number, threshold: number): boolean {
  return zoom >= threshold
}

/** Comme gpu-client {@link LegendImages#getUrl}. */
export function legendImageUrl(
  imagePath: string,
  imageName: string,
  scaleDependant: boolean,
  threshold: number,
  zoom: number,
): string {
  let name = imageName
  if (scaleDependant) {
    name += isHighScaleZoom(zoom, threshold) ? '-highscale' : '-lowscale'
  }
  return `${imagePath}${name}.png`
}

export function resolveLegendItemImageUrl(item: LegendItem, zoom: number): string | undefined {
  if (item.legendImageName && item.legendImagePath) {
    return legendImageUrl(
      item.legendImagePath,
      item.legendImageName,
      item.legendScaleDependant === true,
      item.legendScaleThreshold ?? DEFAULT_SCALE_DEPENDANT_THRESHOLD,
      zoom,
    )
  }
  return item.imageUrl
}

export function resolveLegendImageDetailDirectory(): string {
  const fromMerged =
    typeof config.legendImageDetailDirectory === 'string' ? config.legendImageDetailDirectory : ''
  if (fromMerged) return normalizeLegendImageBaseUrl(fromMerged)

  const w = typeof window !== 'undefined' ? window : undefined
  const gpuCfg = (w as Window & { gpu?: { config?: Record<string, unknown> } })?.gpu?.config
  const fromGpu =
    typeof gpuCfg?.legendImageDetailDirectory === 'string' ? gpuCfg.legendImageDetailDirectory : ''
  return normalizeLegendImageBaseUrl(fromGpu)
}

export function normalizeLegendImageBaseUrl(raw: string): string {
  const withoutQuery = raw.replace(/\?.*$/i, '')
  if (!withoutQuery.length) return ''
  return withoutQuery.endsWith('/') ? withoutQuery : `${withoutQuery}/`
}

export function readLegendConfigArray(raw: unknown): LegendConfigEntry[] {
  if (Array.isArray(raw)) return raw as LegendConfigEntry[]
  if (raw && typeof raw === 'object') return Object.values(raw) as LegendConfigEntry[]
  return []
}

function hasFilterIn(layer: GpuLayerConfig): boolean {
  return Boolean(layer.filterAttribute && layer.filterValue?.length)
}

function isPsmvLayerName(layerName: string): boolean {
  return layerName.slice(-5) === '_psmv'
}

function hasLegendReferences(layerName: string, refs: GpuLegendBuildOptions['legendReferences']): boolean {
  return layerName in refs
}

function getLegendReferenceRuleKey(
  layerName: string,
  rule: string,
  refs: GpuLegendBuildOptions['legendReferences'],
): string {
  const bucket = refs[layerName]
  if (!bucket) return rule
  if (bucket[rule]) return rule
  if ((layerName === 'info' || layerName === 'prescription') && /^\d{2}$/.test(rule)) {
    const defaultKey = `${rule}-00`
    if (bucket[defaultKey]) return defaultKey
    const prefix = `${rule}-`
    const matching = Object.keys(bucket)
      .filter((k) => k.startsWith(prefix))
      .sort()
    if (matching.length) return matching[0]!
  }
  return rule
}

function getLegendReference(
  layerName: string,
  rule: string,
  refs: GpuLegendBuildOptions['legendReferences'],
): LegendReferenceEntry | undefined {
  const bucket = refs[layerName]
  if (!bucket) return undefined
  return bucket[getLegendReferenceRuleKey(layerName, rule, refs)]
}

function getImageNameByGpuLayer(
  layer: GpuLayerConfig,
  rule: string,
  subRule: string | null,
  geometryType: string,
): string {
  const base = normalizeLayerNameForLegend((layer.name ?? '').split(',')[0]!)
  let imageName = `${base}_${geometryType}/${rule}`
  if (subRule) imageName += `-${subRule}`
  return imageName
}

function getImageNameByLegendReferences(layerName: string, ruleName: string, type?: string): string {
  if (type) return `${type}/${ruleName}`
  return `${normalizeLayerNameForLegend(layerName)}/${ruleName}`
}

function getGeometryTypesForLegendWithFilter(
  layerName: string,
  rule: string,
  legendConfig: LegendConfigEntry[],
): string[] {
  const geometryTypes: string[] = []
  for (const entry of legendConfig) {
    const childLayerName = normalizeLayerNameForLegend(entry.name)
    if (childLayerName.split(`${layerName}_`).length <= 1) continue
    if (entry.allowedValues?.includes(rule)) {
      geometryTypes.push(childLayerName.split(`${layerName}_`)[1]!)
    }
  }
  return geometryTypes
}

function getGeometryTypesForLegendWithFilterAndSubFilter(
  layerName: string,
  rule: string,
  subRule: string,
  legendConfig: LegendConfigEntry[],
): string[] {
  const geometryTypes: string[] = []
  for (const entry of legendConfig) {
    const childLayerName = normalizeLayerNameForLegend(entry.name)
    const suffix = childLayerName.split(`${layerName}_`)[1]
    if (!suffix || !GEOMETRY_TYPES.includes(suffix as (typeof GEOMETRY_TYPES)[number])) continue
    if (!entry.allowedValues?.includes(rule)) continue
    if (entry.hasfilter2?.[rule]?.includes(subRule)) {
      geometryTypes.push(suffix)
    }
  }
  return geometryTypes
}

function getSubRules(layerName: string, rule: string, legendConfig: LegendConfigEntry[]): string[] {
  const subRules: string[] = []
  for (const entry of legendConfig) {
    const entryName = normalizeLayerNameForLegend(entry.name)
    for (const geometryType of GEOMETRY_TYPES) {
      if (entryName !== `${layerName}_${geometryType}`) continue
      const list = entry.hasfilter2?.[rule]
      if (!list?.length) continue
      for (const subRule of list) {
        if (!subRules.includes(subRule)) subRules.push(subRule)
      }
    }
  }
  return subRules
}

function getOtherLegendImageNamesByFilterValues(
  layerName: string,
  rules: string[],
  legendConfig: LegendConfigEntry[],
): string[] {
  const imageNames: string[] = []
  for (const entry of legendConfig) {
    const childLayerName = normalizeLayerNameForLegend(entry.name)
    if (childLayerName.split(`${layerName}_`).length <= 1) continue
    if (entry.other !== true) continue
    const matchesRule = entry.allowedValues?.some((v) => rules.includes(v))
    if (!matchesRule) continue
    imageNames.push(`${childLayerName}/other`)
  }
  return imageNames
}

function pushLegendItemsFromNames(
  items: LegendItem[],
  names: string[],
  title: string,
  opts: GpuLegendBuildOptions,
  scaleDependant: boolean,
  threshold: number,
  idPrefix: string,
): void {
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!
    const item: LegendItem = {
      id: `${idPrefix}-${i}-${name}`,
      title: names.length > 1 ? `${title} (${i + 1})` : title,
      legendImageName: name,
      legendImagePath: opts.imagePath,
      legendScaleDependant: scaleDependant,
      legendScaleThreshold: threshold,
    }
    if (opts.imagePath) {
      item.imageUrl = legendImageUrl(opts.imagePath, name, scaleDependant, threshold, opts.zoomAtInit)
    }
    items.push(item)
  }
}

function buildNoFilterLegends(layer: GpuLayerConfig, opts: GpuLegendBuildOptions): LegendItem[] {
  const layerName = normalizeLayerNameForLegend((layer.name ?? '').split(',')[0]!)
  if (!hasLegendReferences(layerName, opts.legendReferences)) return []

  const scaleDependant = isLayerScaleDependant(layer, opts.ancestorLayers)
  const threshold = getScaleDependantThreshold(layer, opts.ancestorLayers)
  const items: LegendItem[] = []
  const bucket = opts.legendReferences[layerName]!

  for (const ruleName of Object.keys(bucket)) {
    const ref = bucket[ruleName]!
    if (ref.hide) continue
    const names: string[] = []
    if (Array.isArray(ref.type)) {
      for (const t of ref.type) {
        names.push(getImageNameByLegendReferences(layerName, ruleName, t))
      }
    } else {
      names.push(getImageNameByLegendReferences(layerName, ruleName, ref.type))
    }
    if (ref.combine) {
      for (const subRuleName of Object.keys(ref.combine)) {
        for (const st of ref.combine[subRuleName]!.type) {
          names.push(getImageNameByLegendReferences(layerName, subRuleName, st))
        }
      }
    }
    pushLegendItemsFromNames(items, names, ref.title, opts, scaleDependant, threshold, layerName + ruleName)
  }
  return items
}

function buildFilterLegends(layer: GpuLayerConfig, opts: GpuLegendBuildOptions): LegendItem[] {
  const layerName = normalizeLayerNameForLegend((layer.name ?? '').split(',')[0]!)
  if (!hasLegendReferences(layerName, opts.legendReferences)) return []

  const scaleDependant = isLayerScaleDependant(layer, opts.ancestorLayers)
  const threshold = getScaleDependantThreshold(layer, opts.ancestorLayers)
  const items: LegendItem[] = []

  for (const rule of layer.filterValue ?? []) {
    const subRules = getSubRules(layerName, rule, opts.legendConfig)

    if (subRules.length === 0) {
      const geometryTypes = getGeometryTypesForLegendWithFilter(layerName, rule, opts.legendConfig)
      if (!geometryTypes.length) continue
      const names = geometryTypes.map((g) => getImageNameByGpuLayer(layer, rule, null, g))
      const ref = getLegendReference(layerName, rule, opts.legendReferences)
      if (!ref || ref.hide) continue
      pushLegendItemsFromNames(items, names, ref.title, opts, scaleDependant, threshold, `${layerName}${rule}`)
    } else {
      for (const subRule of subRules) {
        const geometryTypes = getGeometryTypesForLegendWithFilterAndSubFilter(
          layerName,
          rule,
          subRule,
          opts.legendConfig,
        )
        if (!geometryTypes.length) continue
        const names = geometryTypes.map((g) => getImageNameByGpuLayer(layer, rule, subRule, g))
        const subLegendRef = opts.legendReferences[layerName]?.[`${rule}-${subRule}`]
        if (!subLegendRef || subLegendRef.hide) continue
        pushLegendItemsFromNames(
          items,
          names,
          subLegendRef.title,
          opts,
          scaleDependant,
          threshold,
          `${layerName}${rule}-${subRule}`,
        )
      }
    }
  }

  const otherNames = getOtherLegendImageNamesByFilterValues(
    layerName,
    layer.filterValue ?? [],
    opts.legendConfig,
  )
  if (otherNames.length) {
    let title = `Autres ${(layer.title ?? layer.name ?? '').toLowerCase()}`
    if (layerName === 'prescription') title = 'Autres prescriptions'
    pushLegendItemsFromNames(items, otherNames, title, opts, false, threshold, `${layerName}-other`)
  }

  return items
}

export function buildLegendItemsForGpuLayer(
  layer: GpuLayerConfig,
  opts: GpuLegendBuildOptions,
): LegendItem[] {
  if (!layer.name) return []
  if (layer.layers?.length) return []

  const layerName = normalizeLayerNameForLegend(layer.name.split(',')[0]!)
  if (isPsmvLayerName(layerName)) return []
  if (!hasLegendReferences(layerName, opts.legendReferences)) return []

  if (hasFilterIn(layer)) return buildFilterLegends(layer, opts)
  return buildNoFilterLegends(layer, opts)
}

export function readGpuLegendBuildOptions(zoomAtInit = 6): GpuLegendBuildOptions {
  const w = typeof window !== 'undefined' ? window : undefined
  const legendConfig = readLegendConfigArray(w?.LEGEND_CONFIG)
  const legendReferences = (
    w?.LEGEND_REFERENCES && typeof w.LEGEND_REFERENCES === 'object'
      ? w.LEGEND_REFERENCES
      : {}
  ) as Record<string, Record<string, LegendReferenceEntry>>

  return {
    legendConfig,
    legendReferences,
    imagePath: resolveLegendImageDetailDirectory(),
    zoomAtInit,
    ancestorLayers: [],
  }
}
