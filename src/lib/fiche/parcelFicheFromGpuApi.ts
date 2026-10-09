import config from '@/lib/config'
import { coerceDisplayString } from '@/lib/coerceDisplayString'
import { escapeHtml } from '@/lib/fiche/ficheInfoHtml'
import {
  documentCardBadgesHtml,
  documentIsNonExecutoireEffectiveStatus,
  FICHE_NON_EXECUTOIRE_CALLOUT_HTML,
} from '@/lib/fiche/ficheDocumentPresentation'
import {
  labelsForParcelFeature,
  formatParcelRuleLabel,
  type ParcelFeatureLabel,
} from '@/lib/fiche/parcelFeatureLabel'
import type { SupCategory } from '@/lib/fiche/parcelLegendImage'
import {
  createParcelFeatureLabel,
  DEFAULT_PARCEL_FICHE_LEGEND_ZOOM,
  getSupLabelFromProperties,
  readSupCategories,
  resolveParcelFeatureLegendImageUrl,
} from '@/lib/fiche/parcelLegendImage'
import { resolveConfigUrlForFetch } from '@/lib/configUrls'

export type ParcelFicheFeature = {
  id?: string
  properties?: Record<string, unknown>
}

export type GpuParcelFichePayload = {
  parcel?: {
    type?: string
    features?: Array<{ properties?: Record<string, unknown> }>
  }
  features?: ParcelFicheFeature[]
  typeref?: string | null
}

export function isGpuParcelFichePayload(data: unknown): data is GpuParcelFichePayload {
  return Boolean(data && typeof data === 'object' && 'features' in data)
}

function layerPrefix(featureId: string): string {
  const dot = featureId.indexOf('.')
  return dot >= 0 ? featureId.slice(0, dot) : featureId
}

type RuleSection =
  'zonage' | 'prescription' | 'information' | 'secteur' | 'sup' | 'scot' | 'mec' | 'document'

const SECTION_TITLES: Record<RuleSection, string> = {
  zonage: 'Zonage(s)',
  prescription: 'Prescriptions',
  information: 'Périmètres d’informations',
  secteur: 'Secteurs',
  sup: 'Servitudes d’utilité publique',
  scot: 'Schémas de cohérence territoriale',
  mec: 'Mises en compatibilité',
  document: 'Documents',
}

function classifyFeature(feature: ParcelFicheFeature): RuleSection | null {
  const id = feature.id ?? ''
  const prefix = layerPrefix(id)
  if (prefix === 'zone_urba') return 'zonage'
  if (prefix.startsWith('prescription')) return 'prescription'
  if (prefix.startsWith('info_')) return 'information'
  if (prefix === 'secteur_cc') return 'secteur'
  if (prefix.startsWith('assiette_sup')) return 'sup'
  if (prefix === 'scot') return 'scot'
  if (prefix === 'mec') return 'mec'
  if (prefix === 'document') return 'document'
  return null
}

function ruleTextsForFeature(
  feature: ParcelFicheFeature,
  featureLabel: ParcelFeatureLabel,
  supCategories: SupCategory[],
): { title: string; subtitle: string } {
  const props = feature.properties ?? {}
  const section = classifyFeature(feature)
  if (section === 'sup') {
    const title = getSupLabelFromProperties(props, supCategories)
    const subtitle = coerceDisplayString(props.nomsuplitt)
    return { title, subtitle }
  }
  if (section === 'scot') {
    return {
      title: formatParcelRuleLabel(coerceDisplayString(props.title) || 'SCoT'),
      subtitle: '',
    }
  }
  if (section === 'mec') {
    return {
      title: formatParcelRuleLabel(
        props.libelle
          ? `Mise en compatibilité - ${coerceDisplayString(props.libelle)}`
          : 'Mise en compatibilité',
      ),
      subtitle: '',
    }
  }
  const labels = labelsForParcelFeature(featureLabel, props)
  if (!labels.length) {
    return { title: 'Règle d’urbanisme', subtitle: '' }
  }
  return { title: labels[0], subtitle: labels.slice(1).join(' — ') }
}

function ruleIconInnerHtml(feature: ParcelFicheFeature, zoom: number): string {
  const imageUrl = resolveParcelFeatureLegendImageUrl(feature, zoom)
  if (imageUrl) {
    return `<img class="ec-fiche-info__rule-icon-img" src="${escapeHtml(imageUrl)}" alt="" width="40" height="40" loading="lazy" decoding="async" />`
  }
  const props = feature.properties ?? {}
  const fallback =
    coerceDisplayString(props.libelle ?? props.typezone ?? props.typepsc ?? props.suptype)
      .slice(0, 4)
      .toUpperCase() || '—'
  return escapeHtml(fallback)
}

function ruleRowHtml(
  feature: ParcelFicheFeature,
  zoom: number,
  featureLabel: ParcelFeatureLabel,
  supCategories: SupCategory[],
): string {
  const props = feature.properties ?? {}
  const { title, subtitle } = ruleTextsForFeature(feature, featureLabel, supCategories)
  const urlfic = coerceDisplayString(props.urlfic)
  const docLink = urlfic
    ? `<a class="ec-fiche-info__rule-doc" href="${escapeHtml(urlfic)}" target="_blank" rel="noopener noreferrer" title="Pièce écrite"><span class="ri-file-line" aria-hidden="true"></span></a>`
    : `<span class="ec-fiche-info__rule-doc ec-fiche-info__rule-doc--muted" aria-hidden="true"><span class="ri-file-line"></span></span>`
  const subBlock = subtitle ? `<p class="ec-fiche-info__rule-sub">${escapeHtml(subtitle)}</p>` : ''
  const iconInner = ruleIconInnerHtml(feature, zoom)
  return `<article class="ec-fiche-info__rule-row"><div class="ec-fiche-info__rule-icon" aria-hidden="true">${iconInner}</div><div class="ec-fiche-info__rule-body"><p class="ec-fiche-info__rule-title">${escapeHtml(title)}</p>${subBlock}</div>${docLink}</article>`
}

function documentCardFromFeature(feature: ParcelFicheFeature): string {
  const props = feature.properties ?? {}
  const title =
    coerceDisplayString(props.title) ||
    coerceDisplayString(props.originalName) ||
    coerceDisplayString(props.name) ||
    'Document d’urbanisme'
  const status = coerceDisplayString(props.status) || undefined
  const effective = coerceDisplayString(props.effectiveStatus) || undefined
  const badges = documentCardBadgesHtml({
    effectiveStatus: effective,
    status,
    defaultApprovedWhenStatusMissing: true,
  })
  const archive = coerceDisplayString(props.archiveUrl ?? props.urlfic)
  const titleInner = escapeHtml(title)
  const titleBlock = archive
    ? `<a class="ec-fiche-info__doc-card-title" href="${escapeHtml(archive)}" target="_blank" rel="noopener noreferrer">${titleInner}</a>`
    : `<p class="ec-fiche-info__doc-card-title">${titleInner}</p>`
  return `<article class="ec-fiche-info__doc-card">${badges ? `<div class="ec-fiche-info__doc-card-badges">${badges}</div>` : ''}${titleBlock}</article>`
}

function groupFeatures(features: ParcelFicheFeature[]): Map<RuleSection, ParcelFicheFeature[]> {
  const map = new Map<RuleSection, ParcelFicheFeature[]>()
  for (const feature of features) {
    const section = classifyFeature(feature)
    if (!section || section === 'document') continue
    const list = map.get(section) ?? []
    list.push(feature)
    map.set(section, list)
  }
  return map
}

export function buildParcelInfosHtmlFromFiche(
  data: GpuParcelFichePayload,
  zoom = DEFAULT_PARCEL_FICHE_LEGEND_ZOOM,
): string {
  const features = data.features ?? []
  const grouped = groupFeatures(features)
  const featureLabel = createParcelFeatureLabel()
  const supCategories = readSupCategories()
  const order: RuleSection[] = [
    'zonage',
    'prescription',
    'information',
    'secteur',
    'mec',
    'sup',
    'scot',
  ]
  const parts: string[] = []
  for (const section of order) {
    const list = grouped.get(section)
    if (!list?.length) continue
    const rows = list.map((f) => ruleRowHtml(f, zoom, featureLabel, supCategories)).join('')
    parts.push(
      `<section class="ec-fiche-info__rules-section"><h4 class="ec-fiche-info__rules-section-title">${escapeHtml(SECTION_TITLES[section])}</h4>${rows}</section>`,
    )
  }
  if (!parts.length) {
    return '<p>Aucune règle d’urbanisme intersectant cette parcelle.</p>'
  }
  return parts.join('')
}

function documentFeatureIsNonExecutoire(feature: ParcelFicheFeature): boolean {
  const effective = coerceDisplayString(feature.properties?.effectiveStatus) || undefined
  return documentIsNonExecutoireEffectiveStatus(effective)
}

export function buildParcelDocumentsHtmlFromFiche(data: GpuParcelFichePayload): string {
  const features = (data.features ?? []).filter((f) => classifyFeature(f) === 'document')
  const parts: string[] = []
  if (features.some(documentFeatureIsNonExecutoire)) {
    parts.push(FICHE_NON_EXECUTOIRE_CALLOUT_HTML)
  }
  parts.push(
    '<p class="ec-fiche-info__intro">La parcelle est couverte par les documents suivants :</p>',
  )
  parts.push('<h3 class="ec-fiche-info__section-title">Documents d’urbanisme</h3>')
  if (!features.length) {
    parts.push('<p>Aucun document intersectant cette parcelle.</p>')
    return parts.join('')
  }
  parts.push(features.map(documentCardFromFeature).join(''))
  return parts.join('')
}

export function resolveApiParcelFicheUrl(): string | null {
  const raw = config.apiParcelFicheUrl
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length ? trimmed : null
}

export function buildParcelFicheFetchUrl(parcelId: string): string | null {
  const template = resolveApiParcelFicheUrl()
  if (!template) return null
  const placeholders = config.urlPlaceholders as { parcelId?: string } | undefined
  const ph = placeholders?.parcelId ?? '{parcelId}'
  const replaced = template.replaceAll(ph, encodeURIComponent(parcelId))
  return resolveConfigUrlForFetch(replaced)
}

export async function fetchGpuParcelFiche(parcelId: string): Promise<GpuParcelFichePayload> {
  const url = buildParcelFicheFetchUrl(parcelId)
  if (!url) throw new Error('Service fiche parcelle non configuré (apiParcelFicheUrl).')
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) {
    throw new Error(`Parcel fiche HTTP ${res.status}`)
  }
  const data: unknown = await res.json()
  if (!isGpuParcelFichePayload(data)) {
    throw new Error('Invalid parcel fiche payload')
  }
  return data
}
