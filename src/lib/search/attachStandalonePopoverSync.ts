/**
 * Ancre les panneaux autocomplete / Avancée en `position: fixed`
 * sous (ou au-dessus) de la barre de recherche, pour échapper au
 * `overflow: hidden` des bannières (gpu-site) et suivre scroll / resize.
 */

function isPanelVisible(panel: HTMLElement): boolean {
  if (panel.classList.contains('gpf-hidden') || panel.classList.contains('GPelementHidden')) {
    return false
  }
  if (panel.classList.contains('GPAdvancedContainer')) {
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

function queryAnchor(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('.GPSearchBar') ||
    root.querySelector<HTMLElement>('.gpf-widget[id^="GPsearchEngine-Advanced"]') ||
    root
  )
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
    const rect = anchor.getBoundingClientRect()
    const gap = 2
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap

    for (const panel of queryPanels(root)) {
      if (!isPanelVisible(panel)) {
        panel.style.removeProperty('top')
        panel.style.removeProperty('bottom')
        panel.style.removeProperty('left')
        panel.style.removeProperty('width')
        panel.style.removeProperty('max-height')
        continue
      }

      const preferAbove = spaceBelow < 140 && spaceAbove > spaceBelow
      const maxH = preferAbove
        ? Math.min(spaceAbove - 4, window.innerHeight * 0.5, 320)
        : Math.min(spaceBelow - 4, window.innerHeight * 0.5, 320)

      panel.style.left = `${Math.max(0, rect.left)}px`
      panel.style.width = `${Math.max(120, rect.width)}px`
      panel.style.maxHeight = `${Math.max(80, maxH)}px`

      if (preferAbove) {
        panel.style.top = 'auto'
        panel.style.bottom = `${window.innerHeight - rect.top + gap}px`
      } else {
        panel.style.bottom = 'auto'
        panel.style.top = `${rect.bottom + gap}px`
      }
    }
  }

  const schedule = () => {
    if (raf) return
    raf = window.requestAnimationFrame(update)
  }

  const onScrollOrResize = () => schedule()

  window.addEventListener('resize', onScrollOrResize)
  // capture : scroll dans n’importe quel ancêtre
  window.addEventListener('scroll', onScrollOrResize, true)

  const mo = new MutationObserver(schedule)
  mo.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-expanded', 'style', 'data-open'],
  })

  // Premier placement
  schedule()

  return () => {
    if (raf) window.cancelAnimationFrame(raf)
    window.removeEventListener('resize', onScrollOrResize)
    window.removeEventListener('scroll', onScrollOrResize, true)
    mo.disconnect()
    for (const panel of queryPanels(root)) {
      panel.style.removeProperty('top')
      panel.style.removeProperty('bottom')
      panel.style.removeProperty('left')
      panel.style.removeProperty('width')
      panel.style.removeProperty('max-height')
    }
  }
}
