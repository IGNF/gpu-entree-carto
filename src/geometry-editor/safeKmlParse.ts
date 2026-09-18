/** Motifs interdits dans du XML KML issu d’un champ utilisateur (XSS / HTML embarqué). */
const UNSAFE_TAG = /<\s*(script|iframe|object|embed|foreignObject|link|meta|svg)\b/i
const EVENT_HANDLER = /\son[a-z]+\s*=/i
const JAVASCRIPT_URI = /javascript\s*:/i

const DISALLOWED_LOCAL = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'foreignobject',
  'link',
  'meta',
])

/**
 * Rejette les contenus manifestement dangereux avant parsing XML.
 * @throws Error si le texte contient du markup actif.
 */
export function assertSafeKmlXmlText(text: string): void {
  if (UNSAFE_TAG.test(text) || EVENT_HANDLER.test(text) || JAVASCRIPT_URI.test(text)) {
    throw new Error('[entree-carto-geometry-editor] unsafe KML markup rejected')
  }
}

/** Détection stricte : racine KML attendue, pas tout XML/HTML commençant par `<`. */
export function looksLikeKmlDocument(raw: string): boolean {
  const t = raw.trim()
  if (!t.startsWith('<')) return false
  if (UNSAFE_TAG.test(t) || EVENT_HANDLER.test(t) || JAVASCRIPT_URI.test(t)) return false
  return /^<\?xml[\s\S]*?>\s*<kml[\s>/]/i.test(t) || /^<kml[\s>/]/i.test(t)
}

function stripUnsafeNodes(root: Element): void {
  for (let i = root.children.length - 1; i >= 0; i--) {
    const child = root.children[i]!
    const local = child.localName.toLowerCase()
    if (DISALLOWED_LOCAL.has(local)) {
      child.remove()
      continue
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase()
      const value = attr.value
      if (
        name.startsWith('on') ||
        /javascript\s*:/i.test(value) ||
        (name === 'href' && /^\s*javascript:/i.test(value))
      ) {
        child.removeAttribute(attr.name)
      }
    }
    stripUnsafeNodes(child)
  }
}

/**
 * Parse du KML utilisateur en Document XML (pas HTML).
 * Le document est assaini avant lecture OpenLayers.
 */
export function parseUserKmlDocument(text: string): Document {
  assertSafeKmlXmlText(text)
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('[entree-carto-geometry-editor] invalid KML XML')
  }
  const root = doc.documentElement
  if (!root || root.localName.toLowerCase() !== 'kml') {
    throw new Error('[entree-carto-geometry-editor] KML root element required')
  }
  stripUnsafeNodes(root)
  return doc
}
