import { shallowRef, type InjectionKey, type Ref } from 'vue'

/** Onglet interne fiche info (type de document GPU). */
export interface FicheInfoDocumentTab {
  id: string
  label: string
  bodyHtml: string
}

/** Contenu de l’onglet fiche info (localisation / GetFeatureInfo plus tard). */
export interface FicheInfoSelection {
  /** En-tête court (commune ou parcelle selon le mode carte). */
  title: string
  /** Détail sous le titre (ex. attributs parcelle en mode Parcelle). */
  headerHtml?: string
  /** Onglets document d’urbanisme / procédures (gpu-site). */
  documentTabs?: FicheInfoDocumentTab[]
  /** Roue de patience : config GPU ou données fiche. */
  loading?: 'config' | 'data'
  bodyHtml?: string
  /** Attributs bruts (affichés dans l’onglet fiche si présents). */
  raw?: Record<string, unknown> | null
}

/** Demande d’ouverture / dépliage d’une légende couche (onglet Légendes). */
export type LegendPanelFocus = {
  layerId: string
  at: number
}

export interface TabPanelsApi {
  /** Ouvre le panneau sur l’onglet `index` (0–3). */
  openTab: (index: number) => void
  /** Ouvre l’onglet Légendes, déplie et scroll vers la couche `layerId`. */
  openLegendForLayer: (layerId: string) => void
  /** Ferme le panneau et désactive l’onglet. */
  closePanels: () => void
  /** Met à jour la fiche info (+ raw optionnel) et ouvre l’onglet 0. */
  showSelection: (selection: FicheInfoSelection) => void
  /** Remet l’état « Aucune sélection ». */
  clearSelection: () => void
  isOpen: Ref<boolean>
  activeTab: Ref<number | null>
  selection: Ref<FicheInfoSelection | null>
}

/** Consommé par `LayerLegendsPanel` (focus depuis Couches de données). */
export const legendPanelFocusRef = shallowRef<LegendPanelFocus | null>(null)

export const TAB_PANELS_KEY: InjectionKey<TabPanelsApi> = Symbol('ecTabPanels')

/**
 * Registre global : TabPanels et SearchEngine sont frères sous MapShell
 * (provide/inject ne traverse pas les siblings).
 */
export const tabPanelsApiRef = shallowRef<TabPanelsApi | null>(null)

export function registerTabPanelsApi(api: TabPanelsApi | null): void {
  tabPanelsApiRef.value = api
}

export const TAB_PANEL_IDS = {
  fiche: 0,
  catalogue: 1,
  dataLayers: 2,
  legends: 3,
} as const

/** Texte fiche lorsqu’aucune cerise / sélection n’est active. */
export const DEFAULT_FICHE_EMPTY: FicheInfoSelection = {
  title: 'Aucune sélection en cours',
  bodyHtml: `<p>Pour sélectionner une parcelle&nbsp;:</p>
<ul>
<li>choisissez le mode Parcelle</li>
<li>puis cliquez sur la carte ou utilisez la barre de recherche.</li>
</ul>
<p>Pour sélectionner une commune&nbsp;:</p>
<ul>
<li>choisissez le mode Territoire</li>
<li>puis cliquez sur la carte ou utilisez la barre de recherche.</li>
</ul>
<p>Une fois votre sélection effectuée, les informations correspondantes apparaîtront ici.</p>`,
}
