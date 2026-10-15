/**
 * Assets partagés (DSFR icônes, Remix) pour la démo autonome (`public/external/`)
 * sans les dupliquer dans les bundles `dist/` intégrés à gpu-site.
 */

const LOADED = new Set<string>()

export function demoExternalBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base.endsWith('/') ? base : `${base}/`}external/`
}

export function demoExternalStylesheet(pathFromExternalRoot: string): string {
  const normalized = pathFromExternalRoot.replace(/^\//, '')
  return `${demoExternalBaseUrl()}${normalized}`
}

/** Chemin sibling du script entree-carto (ex. gpu-site `build/vendor/remixicon/`). */
export function embedVendorSiblingStylesheet(relativeToEntreeCartoScript: string): string | null {
  if (typeof document === 'undefined') return null
  const scripts = document.getElementsByTagName('script')
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i]?.src
    if (!src || !/entree-carto[^/]*\.min\.js/i.test(src)) continue
    try {
      return new URL(relativeToEntreeCartoScript, src).href
    } catch {
      return null
    }
  }
  return null
}

export function remixIconStylesheetUrl(): string {
  return (
    embedVendorSiblingStylesheet('../remixicon/remixicon.css') ??
    demoExternalStylesheet('remixicon/remixicon.css')
  )
}

/** Feuilles attendues sur gpu-site (dsfr + utility) — pas de rechargement icons.min.css. */
export function hostPageProvidesDsfrIcons(): boolean {
  if (typeof document === 'undefined') return false
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
    const href = link.href
    if (!href) continue
    if (/utility(\.main|\/icons)/i.test(href)) return true
    if (/dsfr.*\.min\.css/i.test(href) && /utility|icons/i.test(href)) return true
  }
  return false
}

export function hostPageProvidesRemixIcon(): boolean {
  if (typeof document === 'undefined') return false
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
    const href = link.href
    if (href && /remixicon/i.test(href)) return true
  }
  return false
}

function loadStylesheet(href: string): Promise<void> {
  if (LOADED.has(href)) return Promise.resolve()
  const existing = document.querySelector<HTMLLinkElement>(`link[data-ec-external-css="${href}"]`)
  if (existing) {
    LOADED.add(href)
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.ecExternalCss = href
    link.onload = () => {
      LOADED.add(href)
      resolve()
    }
    link.onerror = () => reject(new Error(`Feuille de style externe introuvable : ${href}`))
    document.head.appendChild(link)
  })
}

/** Carte embarquée (createStandardViewer) : icônes DSFR si le site hôte ne les fournit pas. */
export async function ensureEmbedSharedStylesheets(): Promise<void> {
  if (typeof document === 'undefined') return
  if (!hostPageProvidesDsfrIcons()) {
    await loadStylesheet(demoExternalStylesheet('dsfr/utility/icons/icons.min.css'))
  }
  if (!hostPageProvidesRemixIcon()) {
    await loadStylesheet(remixIconStylesheetUrl())
  }
}
