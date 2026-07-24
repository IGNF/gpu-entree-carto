import { shallowRef, type InjectionKey, type Ref } from 'vue'

/** Contenu de l’onglet fiche info (localisation / GetFeatureInfo plus tard). */
export interface FicheInfoSelection {
  title: string
  bodyHtml?: string
  /** Attributs bruts pour l’onglet 4. */
  raw?: Record<string, unknown> | null
}

export interface TabPanelsApi {
  /** Ouvre le panneau sur l’onglet `index` (0–3). */
  openTab: (index: number) => void
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
  empty: 1,
  layers: 2,
  raw: 3,
} as const

export const DEFAULT_FICHE_EMPTY = {
  title: 'Aucune sélection en cours',
  bodyHtml:
    '<p>Pour sélectionner une parcelle, cliquez directement sur la carte. Pour sélectionner une commune, utilisez la barre de recherche ou zoomez jusqu’à la voir apparaître, puis cliquez dessus.</p>',
} as const
