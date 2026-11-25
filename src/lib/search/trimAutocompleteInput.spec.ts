import { describe, expect, it, vi } from 'vitest'
import { installAutocompleteTrim } from '@/lib/search/trimAutocompleteInput'

describe('installAutocompleteTrim (géocodage : 3 à 200 caractères, sans espace en tête)', () => {
  it('« 10 » suivi d’un espace : pas de requête (2 caractères utiles)', () => {
    const autocomplete = vi.fn()
    const engine = { autocomplete }
    installAutocompleteTrim(engine)
    engine.autocomplete('10 ')
    engine.autocomplete('  ab')
    expect(autocomplete).not.toHaveBeenCalled()
  })

  it('texte valide : envoyé sans les espaces de début et de fin', () => {
    const autocomplete = vi.fn()
    const engine = { autocomplete }
    installAutocompleteTrim(engine)
    engine.autocomplete('  10 rue ')
    expect(autocomplete).toHaveBeenCalledWith('10 rue')
  })
})
