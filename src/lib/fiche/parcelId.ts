import { coerceDisplayString } from '@/lib/coerceDisplayString'

/**
 * IDU cadastral (sans séparateurs), ex. `95197000AK0432` → identifiant gpu-site
 * `95_197_000_000_AK_0432` (préfixe 8 chiffres = dep + com + arr, puis section + numéro).
 */
export function parcelGpuIdFromCadastralIdu(raw: string): string | null {
  const s = raw.trim()
  if (!s || s.includes('_')) return null
  // Section 2 car. + numéro 4 chiffres en fin (cas courant métropole).
  const m = /^(\d{2})(\d{3})(\d{3})([A-Za-z]{2})(\d{4})$/.exec(s)
  if (!m) return null
  const [, dep, com, arr, section, numero] = m
  return `${dep}_${com}_${arr}_000_${section.toUpperCase()}_${numero}`
}

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

function normalizeParcelIdCandidate(value: string): string | null {
  const t = value.trim()
  if (!t) return null
  if (t.includes('_')) return t
  const fromIdu = parcelGpuIdFromCadastralIdu(t)
  return fromIdu ?? null
}

export function resolveParcelIdFromRaw(
  raw: Record<string, unknown> | null | undefined,
): string | null {
  if (!raw) return null
  const direct = raw.parcelId
  if (typeof direct === 'string') {
    const n = normalizeParcelIdCandidate(direct)
    if (n) return n
  }

  const parcel = raw.parcel
  if (parcel && typeof parcel === 'object') {
    const p = parcel as Record<string, unknown>
    if (typeof p.id === 'string') {
      const n = normalizeParcelIdCandidate(p.id)
      if (n) return n
    }
    const idu = p.idu
    if (typeof idu === 'string') {
      const n = normalizeParcelIdCandidate(idu)
      if (n) return n
    }
    const fromProps = buildParcelIdFromProperties(p)
    if (fromProps) return fromProps
    const fc = p.features
    if (Array.isArray(fc) && fc[0] && typeof fc[0] === 'object') {
      const feat = fc[0] as { properties?: Record<string, unknown> }
      const fromFeat = buildParcelIdFromProperties(feat.properties)
      if (fromFeat) return fromFeat
      if (typeof feat.properties?.id === 'string') {
        const n = normalizeParcelIdCandidate(feat.properties.id)
        if (n) return n
      }
    }
  }

  if (typeof raw.id === 'string') {
    const n = normalizeParcelIdCandidate(raw.id)
    if (n) return n
  }
  const territoryPid = raw.territoryParcelId
  if (typeof territoryPid === 'string') {
    const n = normalizeParcelIdCandidate(territoryPid)
    if (n) return n
  }
  return buildParcelIdFromProperties(raw)
}
