/** Attributions OL en aperçu / export : pas de liens (évite ::after DSFR), logos lisibles. */
export function sanitizePrintPreviewAttributions(mapRoot: HTMLElement | null | undefined): void {
  if (!mapRoot) return
  const attribution = mapRoot.querySelector('.ol-attribution')
  if (!attribution) return

  for (const anchor of attribution.querySelectorAll('a')) {
    const replacement = document.createElement('span')
    replacement.className = anchor.className
    if (anchor.getAttribute('title')) {
      replacement.setAttribute('title', anchor.getAttribute('title') ?? '')
    }
    replacement.innerHTML = anchor.innerHTML
    anchor.replaceWith(replacement)
  }

  for (const button of attribution.querySelectorAll('button')) {
    button.remove()
  }
}
