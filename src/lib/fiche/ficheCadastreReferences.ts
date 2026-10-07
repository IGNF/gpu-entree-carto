import { coerceDisplayString } from '@/lib/coerceDisplayString'

export type CadastreReferenceRow = {
  label: string
  value: string
}

export type CadastreReferences = {
  /** Ex. 75056 000 AY 0050 */
  headline: string
  rows: CadastreReferenceRow[]
}

function departementFromInsee(codeInsee: string): string {
  if (codeInsee.length >= 2) return codeInsee.slice(0, 2)
  return ''
}

function arrondissementFromInsee(codeInsee: string): string {
  if (
    codeInsee.length === 5 &&
    (codeInsee.startsWith('751') || codeInsee.startsWith('693') || codeInsee.startsWith('132'))
  ) {
    return codeInsee.slice(3, 5)
  }
  if (codeInsee.length >= 5) return codeInsee.slice(2, 5)
  return ''
}

/** Références cadastrales (modal gpu-client / capture Figma). */
export function cadastreReferencesFromParcel(
  parcel: Record<string, unknown> | null | undefined,
): CadastreReferences | null {
  if (!parcel) return null
  const section = coerceDisplayString(parcel.section).trim()
  const numero = coerceDisplayString(parcel.numero).trim()
  const idu = coerceDisplayString(parcel.idu ?? parcel.id).trim()
  if (!section && !numero && !idu) return null

  const codeInsee = coerceDisplayString(parcel.code_insee).trim()
  const headline =
    idu || [codeInsee, section, numero].filter(Boolean).join(' ') || `${section} ${numero}`.trim()

  const rows: CadastreReferenceRow[] = [
    { label: 'Département', value: departementFromInsee(codeInsee) },
    { label: 'Commune', value: coerceDisplayString(parcel.nom_com) },
    { label: 'Code INSEE', value: codeInsee },
  ]

  const codeArr = coerceDisplayString(parcel.code_arr).trim()
  const arr = codeArr && codeArr !== '000' ? codeArr : arrondissementFromInsee(codeInsee)
  if (arr) {
    rows.push({ label: 'Code d’arrondissement', value: arr })
  }

  rows.push(
    { label: 'Section', value: section },
    {
      label: 'Feuille',
      value: coerceDisplayString(parcel.feuille ?? parcel.num_feuf, '1'),
    },
    { label: 'Numéro de parcelle', value: numero },
  )

  const contenance = coerceDisplayString(parcel.contenance)
  if (contenance !== '') {
    rows.push({ label: 'Superficie', value: `${contenance} m²` })
  }

  return { headline, rows: rows.filter((r) => r.value !== '') }
}

export function parcelShortLabel(parcel: Record<string, unknown> | null | undefined): string {
  if (!parcel) return ''
  const section = coerceDisplayString(parcel.section).trim()
  const numero = coerceDisplayString(parcel.numero).trim()
  if (section && numero) return `${section} ${numero}`
  const idu = coerceDisplayString(parcel.idu).trim()
  return idu
}
