import type { AutocompleteLocation } from '@/lib/types'

const LOG_PREFIX = '[entree-carto]'
const DEFAULT_COMPLETION_URL = 'https://data.geopf.fr/geocodage/completion'

interface GeocodeSettings {
  maximumResponses: number
  types: string
  completionUrl: string
}

interface AutoCompleteResponse {
  suggestedLocations: AutocompleteLocation[]
}

/** Réponse brute API REST Géoplateforme completion. */
interface GeopfCompletionResult {
  x: number
  y: number
  country?: string
  fulltext?: string
  kind?: string
  poiType?: string[]
}

interface GeopfCompletionResponse {
  results?: GeopfCompletionResult[]
}

function normalizeGeopfResult(item: GeopfCompletionResult): AutocompleteLocation {
  return {
    fullText: item.fulltext ?? '',
    type: item.country,
    kind: item.kind,
    poiType: item.poiType,
    position: { x: item.x, y: item.y },
  }
}

/**
 * Service de géocodage — Gp si présent, sinon fetch API Géoplateforme.
 * Utilisé par la homepage gpu-site et LocationSearchWidget.
 */
export class Geocode {
  private readonly settings: GeocodeSettings

  constructor(
    options: {
      maximumResponses?: number
      types?: string
      completionUrl?: string
    } = {},
  ) {
    this.settings = {
      maximumResponses: options.maximumResponses ?? 15,
      types: options.types ?? 'PositionOfInterest,StreetAddress',
      completionUrl: (options.completionUrl ?? DEFAULT_COMPLETION_URL).replace(/\/$/, ''),
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

    const maximumResponses = options.maximumResponses ?? this.settings.maximumResponses
    const type = options.types ?? this.settings.types
    const Gp = window.Gp

    if (Gp?.Services?.autoComplete) {
      Gp.Services.autoComplete({
        ssl: true,
        text: trimmed,
        maximumResponses,
        type,
        onSuccess: (response: AutoCompleteResponse) => success(response),
        onFailure: () => fail(),
      })
      return
    }

    void this.fetchCompletion(trimmed, maximumResponses, type).then(success, () => fail())
  }

  private async fetchCompletion(
    text: string,
    maximumResponses: number,
    type: string,
  ): Promise<AutoCompleteResponse> {
    const url = new URL(this.settings.completionUrl.endsWith('/')
      ? this.settings.completionUrl
      : `${this.settings.completionUrl}/`)
    url.searchParams.set('text', text)
    url.searchParams.set('type', type)
    url.searchParams.set('maximumResponses', String(maximumResponses))

    const res = await fetch(url.toString())
    if (!res.ok) {
      console.warn(`${LOG_PREFIX} completion HTTP ${res.status}`)
      throw new Error(`completion ${res.status}`)
    }
    const data = (await res.json()) as GeopfCompletionResponse
    return {
      suggestedLocations: (data.results ?? []).map(normalizeGeopfResult),
    }
  }
}

export default Geocode
