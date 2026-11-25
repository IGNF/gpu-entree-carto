/** Minimum du service de complétion IGN (`text` : 3 à 200 caractères). */
const MIN_AUTOCOMPLETE_CHARS = 3

/**
 * geopf envoie la saisie brute à la complétion dès 3 caractères, espaces compris : « 10 » suivi d’un
 * espace part et le service répond 400. On envoie le texte sans espaces de bord, et rien en dessous de 3.
 */
export function installAutocompleteTrim(engine: { autocomplete: (value: string) => void }): void {
  const original = engine.autocomplete.bind(engine)
  engine.autocomplete = (value: string) => {
    const text = value.trim()
    if (text.length < MIN_AUTOCOMPLETE_CHARS) return
    original(text)
  }
}
