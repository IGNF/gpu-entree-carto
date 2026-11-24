import { TAB_PANEL_IDS, tabPanelsApiRef } from '@/composables/tabPanels'

/** Attribut du lien « catalogue de couches » : ouvre l’onglet catalogue (délégation de clic). */
const OPEN_CATALOG_ATTR = 'data-ec-open-catalog'

const CATALOG_LINK_HTML = `<a href="#" ${OPEN_CATALOG_ATTR}>catalogue de couches</a>`

/** Fiche territoire sans document (hors RNU / documents petite échelle). */
export const TERRITORY_NO_DOCUMENT_HTML = `<p>Pas de document trouvé sur ce territoire dans les données correspondant au ${CATALOG_LINK_HTML} actuel.</p>`

/** Fiche parcelle sans règle d’urbanisme. */
export const PARCEL_NO_RULE_HTML = `<p>Pas de règle d’urbanisme trouvé dans les données correspondant au ${CATALOG_LINK_HTML} actuel intersectant cette parcelle.</p>`

/** Impression : ces messages (et leur lien vers l’interface) ne sont pas imprimés. */
export function stripFicheNoDataHtml(html: string): string {
  return html.replaceAll(TERRITORY_NO_DOCUMENT_HTML, '').replaceAll(PARCEL_NO_RULE_HTML, '').trim()
}

/** Écouteur de clic posé sur la fiche : le lien « catalogue de couches » ouvre le catalogue. */
export function onFicheCatalogLinkClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element) || !target.closest(`[${OPEN_CATALOG_ATTR}]`)) return
  event.preventDefault()
  tabPanelsApiRef.value?.openTab(TAB_PANEL_IDS.catalogue)
}
