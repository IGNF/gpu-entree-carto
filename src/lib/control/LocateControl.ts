import type { AutocompleteLocation } from '@/lib/types'

/**
 * Filtres de résultats d’autocomplétion (gpu.control.LocateControl).
 */
export class LocateControl {
  isAllowedResult(autocompleteResult: AutocompleteLocation): boolean {
    if (autocompleteResult.type === 'StreetAddress' && autocompleteResult.kind === 'municipality') {
      return false
    }
    return true
  }

  getTextFromAutocompleteResult(autocompleteResult: AutocompleteLocation): string {
    let text = autocompleteResult.fullText

    if (autocompleteResult.kind !== 'administratif') {
      if (autocompleteResult.type === 'PositionOfInterest' && autocompleteResult.kind) {
        text += ` - ${autocompleteResult.kind}`
      }
    } else if (autocompleteResult.poiType?.length) {
      text += ` - ${autocompleteResult.poiType.slice(-1)}`
    }

    return text
  }
}

export default LocateControl
