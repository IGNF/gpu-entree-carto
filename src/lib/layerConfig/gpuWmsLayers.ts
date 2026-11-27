import TileLayer from 'ol/layer/Tile'
import TileWMS, { type Options as TileWMSOptions } from 'ol/source/TileWMS'
import { createXYZ } from 'ol/tilegrid.js'
import type OlMap from 'ol/Map'
import type View from 'ol/View'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import config from '@/lib/config'
import type { StandardViewerDocument } from '@/lib/types'
import {
  layerConfigToCatalogEntries,
  type GpuLayerCatalogEntry,
  type GpuLayerConfig,
} from '@/lib/layerConfig/gpuLayerConfig'
import { getLayerResolutionRange } from '@/lib/layerConfig/layerResolutionRange'

/**
 * Propriété de couche : options de la source WMS GPU, pour que l'impression la recrée en hidpi
 * (la carte demande des tuiles à 1x, voir `createGroupLayer`).
 */
export const GPU_WMS_SOURCE_OPTIONS_PROP = 'ecGpuWmsSourceOptions'

/** Propriété de couche : ids catalogue regroupés dans la requête (bas → haut). */
export const GPU_WMS_CATALOG_IDS_PROP = 'ecGpuCatalogIds'

/** z-index de la première couche de la pile utilisateur (au-dessus des limites administratives). */
const STACK_BASE_Z_INDEX = 200

function wmsUrl(): string {
  const url = config.wmsExterneUrl
  return typeof url === 'string' && url.length ? url : 'https://data.geopf.fr/wms-v/ows'
}

/** Filtre CQL comme gpu-client `CreateTreeLayerSwitcherItems#createCqlFilterFromGpuLayer`. */
function buildCqlFilter(layer: GpuLayerConfig, document: StandardViewerDocument | null): string {
  const parts: string[] = []
  const configuredName = layer.name ?? ''
  if (
    document?.status === 'document.preview' &&
    document.name &&
    !configuredName.endsWith('municipality')
  ) {
    parts.push(`(partition like '${document.name}')`)
  }
  if (layer.filterAttribute && layer.filterValue?.length) {
    parts.push(`${layer.filterAttribute} IN ('${layer.filterValue.join("','")}')`)
  } else if (layer.filterAttribute && layer.filterValueLike) {
    parts.push(`${layer.filterAttribute} LIKE '${layer.filterValueLike}'`)
  }
  return parts.join(' AND ')
}

/** Requête GetMap d'une entrée seule : URL, sous-couches GeoServer et filtre CQL. */
export interface GpuWmsEntryRequest {
  url: string
  subLayers: string[]
  cql: string
}

/** `null` pour une entrée sans couche WMS (`virtual` ou sans `name`). */
export function resolveEntryRequest(
  entry: GpuLayerCatalogEntry,
  document: StandardViewerDocument | null,
): GpuWmsEntryRequest | null {
  const layer = entry.config
  if (layer.virtual || !layer.name) return null

  let subLayers = layer.name.split(',')
  let url = wmsUrl()

  if (document?.status === 'document.preview' && !layer.name.endsWith('municipality')) {
    const validation = config.wmsValidationUrl
    if (typeof validation === 'string' && validation.length) {
      url = validation
    }
    subLayers = subLayers.map((n) => `${n}_previsu`)
  }

  return { url, subLayers, cql: buildCqlFilter(layer, document) }
}

/** Entrée affichée, dans l'ordre de la pile (bas → haut), candidate au regroupement. */
export interface GpuWmsGroupCandidate extends GpuWmsEntryRequest {
  id: string
  opacity: number
  grayscale: boolean
  /** Étage de z-index : seules les entrées du même étage sont regroupées. */
  tier: string
  minResolution: number
  maxResolution: number
  /** Repli après erreur : jamais regroupée. */
  standalone?: boolean
}

/** Couches GeoServer servies par une seule source WMS. */
export interface GpuWmsGroup {
  ids: string[]
  url: string
  /** Paramètre `LAYERS` (premier nom = dessiné en bas). */
  layers: string
  /** Paramètre `cql_filter`, un filtre par sous-couche ; absent si aucun filtre. */
  cqlFilter?: string
  opacity: number
  grayscale: boolean
  tier: string
  minResolution: number
  maxResolution: number
}

function sameOpacity(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6
}

function canJoin(group: GpuWmsGroupCandidate[], next: GpuWmsGroupCandidate): boolean {
  const last = group[group.length - 1]
  if (!last || last.standalone || next.standalone) return false
  return (
    last.url === next.url &&
    last.tier === next.tier &&
    last.grayscale === next.grayscale &&
    sameOpacity(last.opacity, next.opacity)
  )
}

function toGroup(members: GpuWmsGroupCandidate[]): GpuWmsGroup {
  const first = members[0]
  const layers = members.flatMap((m) => m.subLayers)
  const hasCql = members.some((m) => m.cql)
  // GeoServer exige un filtre par sous-couche (« Layers and filters are mismatched »)
  const cqlFilter = hasCql
    ? members.flatMap((m) => m.subLayers.map(() => m.cql || 'INCLUDE')).join(';')
    : undefined
  return {
    ids: members.map((m) => m.id),
    url: first.url,
    layers: layers.join(','),
    cqlFilter,
    opacity: first.opacity,
    grayscale: first.grayscale,
    tier: first.tier,
    minResolution: Math.max(...members.map((m) => m.minResolution)),
    maxResolution: Math.min(...members.map((m) => m.maxResolution)),
  }
}

/**
 * Regroupe les entrées contiguës (bas → haut) de même URL, opacité, noir et blanc et étage :
 * une requête GetMap par groupe au lieu d'une par couche.
 */
export function computeWmsGroups(candidates: GpuWmsGroupCandidate[]): GpuWmsGroup[] {
  const groups: GpuWmsGroupCandidate[][] = []
  for (const candidate of candidates) {
    const current = groups[groups.length - 1]
    if (current && canJoin(current, candidate)) current.push(candidate)
    else groups.push([candidate])
  }
  return groups.map(toGroup)
}

function groupSignature(group: Pick<GpuWmsGroup, 'url' | 'layers' | 'cqlFilter'>): string {
  return `${group.url}|${group.layers}|${group.cqlFilter ?? ''}`
}

function groupParams(group: GpuWmsGroup): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {
    LAYERS: group.layers,
    TRANSPARENT: true,
    VERSION: '1.1.1',
    FORMAT: 'image/png',
    TILED: true,
  }
  if (group.cqlFilter) params.cql_filter = group.cqlFilter
  return params
}

const WMS_LAYER_GRAYSCALE_CLASS = 'ec-gpu-layer-grayscale'

function applyWmsLayerGrayscale(layer: TileLayer, grayscale: boolean): void {
  if (layer.get('grayscale') === grayscale) return
  const internal = layer as unknown as { className_: string }
  internal.className_ = grayscale ? `ol-layer ${WMS_LAYER_GRAYSCALE_CLASS}` : 'ol-layer'
  layer.set('grayscale', grayscale)
  layer.changed()
}

interface EntryState {
  visible: boolean
  /** 0–1. */
  opacity: number
  grayscale: boolean
}

function defaultOpacity(layer: GpuLayerConfig): number {
  if (layer.forceOpacity) return 1
  return typeof layer.opacity === 'number' ? layer.opacity : 0.7
}

/**
 * Couches WMS GPU de la carte. L'API reste par id catalogue (visibilité, opacité, noir et blanc,
 * ordre) ; le registre regroupe ensuite les entrées affichées compatibles en une seule source
 * (`LAYERS=a,b,c`), recalculée à chaque changement et au passage d'une plage de zoom.
 */
export class GpuWmsLayerRegistry {
  private readonly entries = new Map<string, GpuLayerCatalogEntry>()
  private readonly requests = new Map<string, GpuWmsEntryRequest | null>()
  private readonly stateById = new Map<string, EntryState>()
  /** Ordre utilisateur (bas → haut) transmis par `applyStackOrder`. */
  private stackOrder: string[] = []
  /** Entrées sorties des groupes après une erreur de tuile. */
  private readonly ungroupedIds = new Set<string>()
  /** Couches OL des groupes, dans l'ordre de la carte (bas → haut). */
  private groupLayers: TileLayer[] = []
  private readonly errorKeys = new Map<TileLayer, EventsKey>()
  private map: OlMap | null = null
  private mapKeys: EventsKey[] = []
  private viewKey: EventsKey | null = null
  private document: StandardViewerDocument | null = null
  private rebuildPending = false
  private lastInRangeKey = ''

  loadFromLayerConfig(layers: GpuLayerConfig[], document: StandardViewerDocument | null): void {
    this.document = document
    this.removeGroupLayers()
    this.entries.clear()
    this.requests.clear()
    this.stateById.clear()
    this.ungroupedIds.clear()
    this.stackOrder = []
    this.lastInRangeKey = ''

    for (const entry of layerConfigToCatalogEntries(layers)) {
      this.entries.set(entry.id, entry)
    }
  }

  attachMap(map: OlMap): void {
    if (this.map !== map) {
      this.detachMap()
      this.map = map
      this.mapKeys = [map.on('change:view', () => this.bindView())]
      this.bindView()
    }
    this.rebuild()
  }

  detachMap(): void {
    if (!this.map) return
    this.removeGroupLayers()
    unByKey(this.mapKeys)
    this.mapKeys = []
    if (this.viewKey) unByKey(this.viewKey)
    this.viewKey = null
    this.map = null
  }

  setVisible(catalogId: string, visible: boolean): void {
    this.patchState(catalogId, { visible })
  }

  setOpacity(catalogId: string, opacityPercent: number): void {
    this.patchState(catalogId, { opacity: Math.min(100, Math.max(0, opacityPercent)) / 100 })
  }

  setGrayscale(catalogId: string, grayscale: boolean): void {
    this.patchState(catalogId, { grayscale })
  }

  hasWmsLayer(catalogId: string): boolean {
    return this.entries.has(catalogId)
  }

  /**
   * Empile les couches WMS selon l’ordre utilisateur (bas → haut).
   * Les entrées `forceOpacity` restent au sommet même si absentes de la liste.
   */
  applyStackOrder(catalogIdsBottomToTop: string[]): void {
    this.stackOrder = [...catalogIdsBottomToTop]
    this.scheduleRebuild()
  }

  /** Applique tout de suite les changements en attente (sinon : microtâche). */
  flush(): void {
    if (this.rebuildPending) this.rebuild()
  }

  private patchState(catalogId: string, patch: Partial<EntryState>): void {
    const entry = this.entries.get(catalogId)
    if (!entry) return
    const prev = this.stateById.get(catalogId) ?? {
      visible: false,
      opacity: defaultOpacity(entry.config),
      grayscale: false,
    }
    this.stateById.set(catalogId, { ...prev, ...patch })
    this.scheduleRebuild()
  }

  private scheduleRebuild(): void {
    if (this.rebuildPending) return
    this.rebuildPending = true
    queueMicrotask(() => {
      if (this.rebuildPending) this.rebuild()
    })
  }

  private bindView(): void {
    if (this.viewKey) unByKey(this.viewKey)
    this.viewKey = null
    const view = this.map?.getView()
    if (!view) return
    this.viewKey = view.on('change:resolution', () => this.onResolutionChange())
    this.onResolutionChange()
  }

  /** Regroupe en synchrone si une couche entre ou sort de sa plage de zoom (avant le rendu). */
  private onResolutionChange(): void {
    const view = this.map?.getView()
    if (!view) return
    if (this.inRangeKey(view) !== this.lastInRangeKey) this.rebuild()
  }

  private request(catalogId: string): GpuWmsEntryRequest | null {
    if (!this.requests.has(catalogId)) {
      const entry = this.entries.get(catalogId)
      this.requests.set(catalogId, entry ? resolveEntryRequest(entry, this.document) : null)
    }
    return this.requests.get(catalogId) ?? null
  }

  private resolutionRange(view: View, entry: GpuLayerCatalogEntry) {
    return getLayerResolutionRange(view, entry.minZoomLevel ?? 0, entry.maxZoomLevel ?? 22)
  }

  /** Ids affichés (visibles, avec requête WMS), ordre de pile bas → haut. */
  private displayedIdsBottomToTop(): string[] {
    const shown = (id: string) => this.stateById.get(id)?.visible === true && !!this.request(id)

    const normal: string[] = []
    const forcePinned: string[] = []
    for (const id of this.stackOrder) {
      if (!shown(id)) continue
      if (this.entries.get(id)?.config.forceOpacity) forcePinned.push(id)
      else normal.push(id)
    }
    const ordered = new Set([...normal, ...forcePinned])

    // Hors liste : `forceOpacity` au sommet, les autres sous la pile (z-index de la config)
    const unordered: string[] = []
    for (const [id, entry] of this.entries) {
      if (ordered.has(id) || !shown(id)) continue
      if (entry.config.forceOpacity) forcePinned.push(id)
      else unordered.push(id)
    }
    const configZ = (id: string) => this.configZIndex(id) ?? 0
    unordered.sort((a, b) => configZ(a) - configZ(b))
    return [...unordered, ...normal, ...forcePinned]
  }

  private configZIndex(catalogId: string): number | undefined {
    const z = this.entries.get(catalogId)?.config.zIndex
    return z ? Number(z) : undefined
  }

  private inRange(view: View, catalogId: string): boolean {
    const resolution = view.getResolution()
    if (resolution === undefined) return true
    const { minResolution, maxResolution } = this.resolutionRange(
      view,
      this.entries.get(catalogId)!,
    )
    return resolution >= minResolution && resolution < maxResolution
  }

  private inRangeKey(view: View): string {
    return this.displayedIdsBottomToTop()
      .filter((id) => this.inRange(view, id))
      .join('|')
  }

  private candidates(view: View): GpuWmsGroupCandidate[] {
    const stacked = new Set([...this.stackOrder, ...this.forceOpacityIds()])
    return this.displayedIdsBottomToTop()
      .filter((id) => this.inRange(view, id))
      .map((id) => {
        const entry = this.entries.get(id)!
        const state = this.stateById.get(id)!
        return {
          ...this.request(id)!,
          id,
          opacity: state.opacity,
          grayscale: state.grayscale,
          tier: stacked.has(id) ? 'stack' : `config:${this.configZIndex(id) ?? ''}`,
          ...this.resolutionRange(view, entry),
          standalone: this.ungroupedIds.has(id),
        }
      })
  }

  private forceOpacityIds(): string[] {
    return [...this.entries.values()].filter((e) => e.config.forceOpacity).map((e) => e.id)
  }

  private rebuild(): void {
    this.rebuildPending = false
    const map = this.map
    const view = map?.getView()
    if (!map || !view) return
    this.lastInRangeKey = this.inRangeKey(view)

    const groups = computeWmsGroups(this.candidates(view))
    const available = [...this.groupLayers]
    const next: TileLayer[] = []
    let stackIndex = 0

    for (const group of groups) {
      const layer = this.takeBestLayer(available, group) ?? this.createGroupLayer(group)
      this.updateGroupLayer(layer, group)
      layer.setZIndex(
        group.tier === 'stack'
          ? STACK_BASE_Z_INDEX + stackIndex++
          : (this.configZIndex(group.ids[0]) ?? 0),
      )
      next.push(layer)
    }

    for (const layer of available) this.disposeGroupLayer(layer)
    this.groupLayers = next
    this.syncMapCollection()
  }

  /** Couche existante partageant le plus d'entrées avec le groupe (tuiles affichées pendant le rechargement). */
  private takeBestLayer(available: TileLayer[], group: GpuWmsGroup): TileLayer | null {
    let best: TileLayer | null = null
    let bestOverlap = 0
    for (const layer of available) {
      const source = layer.getSource() as TileWMS | null
      if (source?.getUrls()?.[0] !== group.url) continue
      const ids = (layer.get(GPU_WMS_CATALOG_IDS_PROP) as string[] | undefined) ?? []
      const overlap = ids.filter((id) => group.ids.includes(id)).length
      if (overlap > bestOverlap) {
        best = layer
        bestOverlap = overlap
      }
    }
    if (best) available.splice(available.indexOf(best), 1)
    return best
  }

  private createGroupLayer(group: GpuWmsGroup): TileLayer {
    const sourceOptions: TileWMSOptions = {
      url: group.url,
      params: groupParams(group),
      crossOrigin: 'anonymous',
      serverType: 'geoserver',
      tileGrid: createXYZ({ tileSize: 512 }),
    }
    // hidpi désactivé : sur écran haute densité, tuiles 512 px agrandies par le navigateur plutôt que
    // 1024 px rendues par GeoServer (4 fois moins de pixels) ; libellés un peu moins nets
    const source = new TileWMS({ ...sourceOptions, hidpi: false })
    const layer = new TileLayer({
      source,
      properties: { [GPU_WMS_SOURCE_OPTIONS_PROP]: sourceOptions, grayscale: false },
    })
    // Une sous-couche en erreur fait échouer tout le groupe : ses entrées repassent en couches seules
    this.errorKeys.set(
      layer,
      source.on('tileloaderror', () => this.onGroupTileError(layer)),
    )
    return layer
  }

  private onGroupTileError(layer: TileLayer): void {
    if (!this.groupLayers.includes(layer)) return
    const ids = (layer.get(GPU_WMS_CATALOG_IDS_PROP) as string[] | undefined) ?? []
    if (ids.length < 2) return
    for (const id of ids) this.ungroupedIds.add(id)
    this.scheduleRebuild()
  }

  private updateGroupLayer(layer: TileLayer, group: GpuWmsGroup): void {
    const signature = groupSignature(group)
    if (layer.get('id') !== signature) {
      const source = layer.getSource() as TileWMS
      const params = source.getParams() as Record<string, unknown>
      if (!group.cqlFilter) delete params.cql_filter
      // Même source : OpenLayers garde les anciennes tuiles affichées jusqu'au chargement des nouvelles
      source.updateParams(
        group.cqlFilter
          ? { LAYERS: group.layers, cql_filter: group.cqlFilter }
          : { LAYERS: group.layers },
      )
      const options = layer.get(GPU_WMS_SOURCE_OPTIONS_PROP) as TileWMSOptions
      layer.set(GPU_WMS_SOURCE_OPTIONS_PROP, { ...options, params: groupParams(group) })
      // `id` : empreinte du cache d'impression (`buildVisibleLayerFingerprint`)
      layer.set('id', signature)
      layer.set('ecGpuLayerName', group.layers)
    }
    layer.set(GPU_WMS_CATALOG_IDS_PROP, group.ids)
    layer.setOpacity(group.opacity)
    layer.setMinResolution(group.minResolution)
    layer.setMaxResolution(group.maxResolution)
    applyWmsLayerGrayscale(layer, group.grayscale)
  }

  private disposeGroupLayer(layer: TileLayer): void {
    this.map?.removeLayer(layer)
    const key = this.errorKeys.get(layer)
    if (key) unByKey(key)
    this.errorKeys.delete(layer)
    layer.dispose()
  }

  private removeGroupLayers(): void {
    for (const layer of this.groupLayers) this.disposeGroupLayer(layer)
    this.groupLayers = []
  }

  /** Ordre de la collection OL = ordre des groupes (l'impression copie dans cet ordre). */
  private syncMapCollection(): void {
    const map = this.map
    if (!map) return
    const own = new Set(this.groupLayers)
    const current = map
      .getLayers()
      .getArray()
      .filter((l) => own.has(l as TileLayer))
    const inOrder =
      current.length === this.groupLayers.length &&
      current.every((l, i) => l === this.groupLayers[i])
    if (inOrder) return
    for (const layer of current) map.removeLayer(layer)
    for (const layer of this.groupLayers) map.addLayer(layer)
  }
}

export const gpuWmsLayerRegistry = new GpuWmsLayerRegistry()
