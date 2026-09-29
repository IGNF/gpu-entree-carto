/** Commune « ville » regroupant des arrondissements municipaux (cadastre / INSEE). */
export function parentCommuneInseeForArrondissement(codeInsee: string): string | null {
  if (!/^\d{5}$/.test(codeInsee)) return null
  if (codeInsee.startsWith('751') && codeInsee !== '75056') return '75056'
  const codeNum = Number(codeInsee)
  if (codeNum >= 13201 && codeNum <= 13216) return '13055'
  if (codeNum >= 69381 && codeNum <= 69389) return '69123'
  return null
}

export function isMunicipalArrondissementInsee(codeInsee: string): boolean {
  return parentCommuneInseeForArrondissement(codeInsee) != null
}
