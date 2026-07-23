import type { AutocompleteLocation } from '@/lib/types'

const LOG_PREFIX = '[entree-carto]'

interface GeocodeSettings {
  maximumResponses: number
  types: string
}

interface AutoCompleteResponse {
  suggestedLocations: AutocompleteLocation[]
}

/**
 * Service de géocodage minimal — délègue à Gp (geoportal-access-lib) si présent.
 * Utilisé par gpu-site sur la page d’accueil (callGazetteerService.js).
 */
export class Geocode {
  private readonly settings: GeocodeSettings

  constructor(options: { maximumResponses?: number; types?: string } = {}) {
    this.settings = {
      maximumResponses: options.maximumResponses ?? 15,
      types: options.types ?? 'PositionOfInterest,StreetAddress',
    }
  }

  autoComplete(
    address: string,
    success: (response: AutoCompleteResponse) => void,
    fail: () => void,
    options: { maximumResponses?: number; types?: string } = {},
  ): void {
    const trimmed = address.trim()
    if (trimmed.length < 3 || trimmed.length > 200) {
      fail()
      return
    }

    const Gp = window.Gp
    if (!Gp?.Services?.autoComplete) {
      console.warn(
        `${LOG_PREFIX} Gp.Services.autoComplete indisponible — charger geoportal-access-lib avant entree-carto.`,
      )
      fail()
      return
    }

    Gp.Services.autoComplete({
      ssl: true,
      text: trimmed,
      maximumResponses: options.maximumResponses ?? this.settings.maximumResponses,
      type: options.types ?? this.settings.types,
      onSuccess: (response: AutoCompleteResponse) => success(response),
      onFailure: () => fail(),
    })
  }
}

export default Geocode
