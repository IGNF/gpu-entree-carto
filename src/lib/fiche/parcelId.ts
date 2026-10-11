import { coerceDisplayString } from '@/lib/coerceDisplayString'

const PARCEL_ID_FIELDS = [
  'code_dep',
  'code_com',
  'code_arr',
  'com_abs',
  'section',
  'numero',
] as const

/** Identifiant gpu-site : `{dep}_{com}_{arr}_{com_abs}_{section}_{numero}`. */
export function buildParcelIdFromProperties(
  properties: Record<string, unknown> | null | undefined,
): string | null {
  if (!properties) return null
  const parts: string[] = []
  for (const field of PARCEL_ID_FIELDS) {
    const v = coerceDisplayString(properties[field]).trim()
    if (!v) return null
    parts.push(v)
  }
  return parts.join('_')
}

export function resolveParcelIdFromRaw(
  raw: Record<string, unknown> | null | undefined,
): string | null {
  if (!raw) return null
  const direct = raw.parcelId
  if (typeof direct === 'string' && direct.includes('_')) return direct

  const parcel = raw.parcel
  if (parcel && typeof parcel === 'object') {
    const p = parcel as Record<string, unknown>
    if (typeof p.id === 'string' && p.id.includes('_')) return p.id
    const fromProps = buildParcelIdFromProperties(p)
    if (fromProps) return fromProps
    const fc = p.features
    if (Array.isArray(fc) && fc[0] && typeof fc[0] === 'object') {
      const feat = fc[0] as { properties?: Record<string, unknown> }
      const fromFeat = buildParcelIdFromProperties(feat.properties)
      if (fromFeat) return fromFeat
      if (typeof feat.properties?.id === 'string') return feat.properties.id
    }
  }

  if (typeof raw.id === 'string' && raw.id.includes('_')) return raw.id
  return buildParcelIdFromProperties(raw)
}
