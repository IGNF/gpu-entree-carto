import { coerceDisplayString } from '@/lib/coerceDisplayString'

export type DuCategory = {
  type: string
  code: string
  libelong: string
}

const ATTR_ZONAGE = 'typezone'
const ATTR_SECTEUR = 'typesect'
const ATTR_PRESCRIPTION = 'typepsc'
const ATTR_INFORMATION = 'typeinf'
const ATTR_SUB_SECTEUR = 'stypesect'
const ATTR_SUB_PRESCRIPTION = 'stypepsc'
const ATTR_SUB_INFORMATION = 'stypeinf'

/** Libellés zonage / prescription / information — aligné gpu-client `FeatureLabel`. */
export class ParcelFeatureLabel {
  constructor(private readonly duCategories: DuCategory[]) {}

  isZonageFeature(properties: Record<string, unknown>): boolean {
    return ATTR_ZONAGE in properties
  }

  getZonageCode(properties: Record<string, unknown>): string {
    return coerceDisplayString(properties.libelle)
  }

  getZonageLabel(properties: Record<string, unknown>): string {
    const long = coerceDisplayString(properties.libelong)
    if (long) return long
    return this.getLabel('zonage', coerceDisplayString(properties[ATTR_ZONAGE]), null) ?? ''
  }

  isSecteurFeature(properties: Record<string, unknown>): boolean {
    return ATTR_SECTEUR in properties
  }

  getSecteurCode(properties: Record<string, unknown>): string {
    return coerceDisplayString(properties.libelle)
  }

  getSecteurLabel(properties: Record<string, unknown>): string {
    const long = coerceDisplayString(properties.libelong)
    if (long) return long
    return (
      this.getLabel(
        'secteur',
        coerceDisplayString(properties[ATTR_SECTEUR]),
        coerceDisplayString(properties[ATTR_SUB_SECTEUR]) || null,
      ) ?? ''
    )
  }

  isPrescriptionFeature(properties: Record<string, unknown>): boolean {
    return ATTR_PRESCRIPTION in properties
  }

  getPrescriptionLabel(properties: Record<string, unknown>): string {
    const lib = coerceDisplayString(properties.libelle)
    if (lib) return lib
    return (
      this.getLabel(
        'prescription',
        coerceDisplayString(properties[ATTR_PRESCRIPTION]),
        coerceDisplayString(properties[ATTR_SUB_PRESCRIPTION]) || null,
      ) ?? ''
    )
  }

  isInformationFeature(properties: Record<string, unknown>): boolean {
    return ATTR_INFORMATION in properties
  }

  getInformationLabel(properties: Record<string, unknown>): string {
    const lib = coerceDisplayString(properties.libelle)
    if (lib) return lib
    return (
      this.getLabel(
        'information',
        coerceDisplayString(properties[ATTR_INFORMATION]),
        coerceDisplayString(properties[ATTR_SUB_INFORMATION]) || null,
      ) ?? ''
    )
  }

  private getLabel(type: string, code: string, sousCode: string | null): string | null {
    if (!code) return null
    let normalized = code
    if (type !== 'zonage') {
      normalized = code.padStart(2, '0')
    }
    if (sousCode) {
      normalized += `-${sousCode.padStart(2, '0')}`
    }
    for (const cat of this.duCategories) {
      if (type === cat.type && normalized === cat.code) {
        return cat.libelong
      }
    }
    return null
  }
}

export function formatParcelRuleLabel(label: string): string {
  const trimmed = label.trim().replace(/[.,]$/, '')
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function labelsForParcelFeature(
  featureLabel: ParcelFeatureLabel,
  properties: Record<string, unknown>,
): string[] {
  const labels: string[] = []
  if (featureLabel.isZonageFeature(properties)) {
    const code = featureLabel.getZonageCode(properties)
    const long = featureLabel.getZonageLabel(properties)
    if (code) labels.push(formatParcelRuleLabel(`Parcelle classée ${code}`))
    if (long && !libelleEqualsLong(code, long)) {
      labels.push(formatParcelRuleLabel(long))
    }
    if (!labels.length) labels.push('Zonage de type inconnu')
  } else if (featureLabel.isSecteurFeature(properties)) {
    const code = featureLabel.getSecteurCode(properties)
    const long = featureLabel.getSecteurLabel(properties)
    if (code) labels.push(formatParcelRuleLabel(`Parcelle classée ${code}`))
    if (long && !libelleEqualsLong(code, long)) {
      labels.push(formatParcelRuleLabel(long))
    }
    if (!labels.length) labels.push('Secteur de type inconnu')
  } else if (featureLabel.isPrescriptionFeature(properties)) {
    const label = featureLabel.getPrescriptionLabel(properties)
    labels.push(formatParcelRuleLabel(label || 'Prescription de type inconnue'))
  } else if (featureLabel.isInformationFeature(properties)) {
    const label = featureLabel.getInformationLabel(properties)
    labels.push(formatParcelRuleLabel(label || 'Information de type inconnue'))
  }
  return labels
}

function libelleEqualsLong(libelle: string, libelong: string): boolean {
  const a = formatParcelRuleLabel(libelle)
  const b = formatParcelRuleLabel(libelong)
  return (
    new RegExp(`^${escapeRegExp(a)}$`, 'ui').test(b) &&
    new RegExp(`^${escapeRegExp(b)}$`, 'ui').test(a)
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
