/**
 * Recherche d’un élément par valeur `data-*` sans interpoler la valeur dans un sélecteur CSS
 * (une URL contenant `"` ou `]` ferait échouer / détournerait `querySelector`).
 */
export function findElementByDataset<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  datasetKey: string,
  value: string,
): HTMLElementTagNameMap[K] | null {
  for (const el of document.getElementsByTagName(tagName)) {
    if (el.dataset[datasetKey] === value) return el
  }
  return null
}
