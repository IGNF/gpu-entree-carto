/**
 * Ancre les panneaux autocomplete / Avancée pour le SearchEngine hors carte.
 * - Autocomplétion : `position: fixed` (échappe aux overflow des bannières).
 * - Avancée : `position: absolute` à 100 % du widget (même largeur que la barre).
 */

function isAdvancedPanel(panel: HTMLElement): boolean {
  return panel.classList.contains('GPAdvancedContainer')
}

function isPanelVisible(panel: HTMLElement): boolean {
  if (panel.classList.contains('gpf-hidden') || panel.classList.contains('GPelementHidden')) {
    return false
  }
  if (isAdvancedPanel(panel)) {
    const widget = panel.closest<HTMLElement>('.gpf-widget[id^="GPsearchEngine-Advanced"]')
    const btn = widget?.querySelector<HTMLElement>('.GPSearchEngine-advanced-btn')
    if (btn && btn.getAttribute('aria-expanded') !== 'true') return false
  }
  const style = window.getComputedStyle(panel)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

function queryPanels(root: HTMLElement): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>('.GPautoCompleteContainer'),
    ...root.querySelectorAll<HTMLElement>(
      '.gpf-widget[id^="GPsearchEngine-Advanced"] > .GPAdvancedContainer',
    ),
  ]
}

/** Barre principale (pas les formulaires imbriqués du panneau Avancée). */
function queryAnchor(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>(
      '.gpf-widget[id^="GPsearchEngine-Advanced"] form.GPSearchBar[id^="GPsearchInput-Base-"]',
    ) ||
    root.querySelector<HTMLElement>('.GPSearchBar') ||
    root.querySelector<HTMLElement>('.gpf-widget[id^="GPsearchEngine-Advanced"]') ||
    root
  )
}

function clearPanelStyles(panel: HTMLElement) {
  panel.style.removeProperty('position')
  panel.style.removeProperty('top')
  panel.style.removeProperty('bottom')
  panel.style.removeProperty('left')
  panel.style.removeProperty('right')
  panel.style.removeProperty('width')
  panel.style.removeProperty('max-height')
}

function placeAdvancedPanel(panel: HTMLElement, anchor: HTMLElement, gap: number) {
  const widget = panel.closest<HTMLElement>('.gpf-widget[id^="GPsearchEngine-Advanced"]')
  if (!widget) return

  const barRect = anchor.getBoundingClientRect()
  const widgetRect = widget.getBoundingClientRect()
  const topOffset = barRect.bottom - widgetRect.top + gap
  const spaceBelow = window.innerHeight - barRect.bottom - gap

  panel.style.position = 'absolute'
  panel.style.left = '0'
  panel.style.right = '0'
  panel.style.width = '100%'
  panel.style.maxWidth = '100%'
  panel.style.top = `${topOffset}px`
  panel.style.bottom = 'auto'
  panel.style.maxHeight = `${Math.max(120, Math.min(spaceBelow - 4, window.innerHeight * 0.55))}px`
}

function placeAutocompletePanel(
  panel: HTMLElement,
  anchor: HTMLElement,
  gap: number,
  rootRect: DOMRect,
) {
  const anchorRect = anchor.getBoundingClientRect()
  const spaceBelow = window.innerHeight - anchorRect.bottom - gap
  const spaceAbove = anchorRect.top - gap
  const maxRight = rootRect.right
  const panelLeft = Math.max(rootRect.left, anchorRect.left)
  const panelWidth = Math.max(120, Math.min(anchorRect.width, maxRight - panelLeft))

  const preferAbove = spaceBelow < 140 && spaceAbove > spaceBelow
  const maxH = preferAbove
    ? Math.min(spaceAbove - 4, window.innerHeight * 0.5, 320)
    : Math.min(spaceBelow - 4, window.innerHeight * 0.5, 320)

  panel.style.position = 'fixed'
  panel.style.left = `${panelLeft}px`
  panel.style.width = `${panelWidth}px`
  panel.style.right = 'auto'
  panel.style.maxHeight = `${Math.max(80, maxH)}px`

  if (preferAbove) {
    panel.style.top = 'auto'
    panel.style.bottom = `${window.innerHeight - anchorRect.top + gap}px`
  } else {
    panel.style.bottom = 'auto'
    panel.style.top = `${anchorRect.bottom + gap}px`
  }
}

/**
 * @returns fonction de cleanup (retire listeners / styles inline)
 */
export function attachStandalonePopoverSync(root: HTMLElement): () => void {
  let raf = 0

  const update = () => {
    raf = 0
    const anchor = queryAnchor(root)
    if (!anchor) return
    const rootRect = root.getBoundingClientRect()
    const gap = 2

    for (const panel of queryPanels(root)) {
      if (!isPanelVisible(panel)) {
        clearPanelStyles(panel)
        continue
      }

      if (isAdvancedPanel(panel)) {
        placeAdvancedPanel(panel, anchor, gap)
      } else {
        placeAutocompletePanel(panel, anchor, gap, rootRect)
      }
    }
  }

  const schedule = () => {
    if (raf) return
    raf = window.requestAnimationFrame(update)
  }

  const onScrollOrResize = () => schedule()

  window.addEventListener('resize', onScrollOrResize)
  window.addEventListener('scroll', onScrollOrResize, true)

  const mo = new MutationObserver(schedule)
  mo.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-expanded', 'style', 'data-open'],
  })

  schedule()

  return () => {
    if (raf) window.cancelAnimationFrame(raf)
    window.removeEventListener('resize', onScrollOrResize)
    window.removeEventListener('scroll', onScrollOrResize, true)
    mo.disconnect()
    for (const panel of queryPanels(root)) {
      clearPanelStyles(panel)
    }
  }
}
