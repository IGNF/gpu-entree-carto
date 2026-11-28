import { shallowRef, type InjectionKey, type Ref } from 'vue'
import { ALL_MAP_MODES, type MapModeId } from '@/lib/map/mapMode'
import type { CadastreReferences } from '@/lib/fiche/ficheCadastreReferences'

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
  /** Mode carte au moment du chargement (1 parcelle, 2 territoire). */
  mapMode?: MapModeId
  /** Ex. AY 0050 (mode Parcelle). */
  parcelLabel?: string
  /** Mode Coordonnées : « Longitude …, latitude … » sous le titre. */
  coordinatesLabel?: string
  /** Libellé bouton retour parcelle (mode Territoire) — ou message d’absence de parcelle. */
  parcelSwitchLabel?: string
  parcelMissingAtPoint?: boolean
  /** Ex. Paris 1er arrondissement (75101) — bouton territoire / titre mode Territoire. */
  territoryTitle?: string
  /** Modal références cadastrales (mode Parcelle). */
  cadastreReferences?: CadastreReferences | null
  /** Onglet Infos — règles d’urbanisme (HTML, chargement différé côté UI). */
  parcelInfosHtml?: string
  /** Onglet Documents parcelle — cartes documents. */
  parcelDocumentsHtml?: string
  /** Détail sous le titre (legacy / APICarto seul). */
  headerHtml?: string
  /** Onglets document d’urbanisme / procédures (mode Territoire). */
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
  /** Ouvre le panneau sur l’onglet `index` (`TAB_PANEL_IDS`, s’il est affiché). */
  openTab: (index: number) => void
  /** Ouvre l’onglet Légendes, déplie et scroll vers la couche `layerId`. */
  openLegendForLayer: (layerId: string) => void
  /** Ferme le panneau et désactive l’onglet. */
  closePanels: () => void
  /** Met à jour la fiche info (+ raw optionnel) et ouvre l’onglet 0. */
  showSelection: (selection: FicheInfoSelection) => void
  /** Met à jour la fiche sans changer l’onglet actif (ex. refresh catalogue). */
  updateSelection: (selection: FicheInfoSelection) => void
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

/** Démontage : n’efface que si ce panneau est encore l’enregistré (sinon celui de la page suivante). */
export function unregisterTabPanelsApi(api: TabPanelsApi): void {
  if (tabPanelsApiRef.value === api) tabPanelsApiRef.value = null
}

export const TAB_PANEL_IDS = {
  fiche: 0,
  catalogue: 1,
  dataLayers: 2,
  legends: 3,
  /** Onglet propre à la page hôte (prop `extraTab` + slot `extra`). */
  extra: 4,
} as const

export type PanelTabDef = {
  id: number
  label: string
  iconKind: 'dsfr' | 'remix'
  iconClass: string
}

const DEFAULT_PANEL_TABS: PanelTabDef[] = [
  {
    id: TAB_PANEL_IDS.fiche,
    label: 'Informations / localisation',
    iconKind: 'dsfr',
    iconClass: 'fr-icon-map-pin-2-line',
  },
  {
    id: TAB_PANEL_IDS.catalogue,
    label: 'Catalogue',
    iconKind: 'remix',
    iconClass: 'ri-map-2-line',
  },
  {
    id: TAB_PANEL_IDS.dataLayers,
    label: 'Couches de données',
    iconKind: 'remix',
    iconClass: 'ri-stack-line',
  },
  {
    id: TAB_PANEL_IDS.legends,
    label: 'Légendes',
    iconKind: 'remix',
    iconClass: 'ri-list-indefinite',
  },
]

/** Onglets affichés : ceux par défaut moins `hiddenTabs`, plus `extraTab` en dernier. */
export function panelTabs(options?: {
  hiddenTabs?: readonly number[]
  extraTab?: Omit<PanelTabDef, 'id'>
}): PanelTabDef[] {
  const hidden = options?.hiddenTabs ?? []
  const tabs = DEFAULT_PANEL_TABS.filter((tab) => !hidden.includes(tab.id))
  if (options?.extraTab) tabs.push({ ...options.extraTab, id: TAB_PANEL_IDS.extra })
  return tabs
}

/** Clés : identifiants de mode (1 Parcelle, 2 Territoire, 3 Coordonnées). */
const EMPTY_FICHE_GOALS: Record<MapModeId, { goal: string; label: string }> = {
  1: { goal: 'sélectionner une parcelle', label: 'Parcelle' },
  2: { goal: 'sélectionner une commune', label: 'Territoire' },
  3: { goal: 'afficher les règles d’urbanisme d’un point', label: 'Coordonnées' },
}

/** Aide de la fiche vide, limitée aux modes activés (le choix du mode n’est cité que s’il y en a plusieurs). */
export function emptyFicheBodyHtml(modes: readonly MapModeId[]): string {
  const action = 'cliquez sur la carte ou utilisez la barre de recherche.'
  const sections = modes.map((mode) => {
    const { goal, label } = EMPTY_FICHE_GOALS[mode]
    const steps =
      modes.length > 1
        ? `<li>choisissez le mode ${label}</li>\n<li>puis ${action}</li>`
        : `<li>${action.charAt(0).toUpperCase()}${action.slice(1)}</li>`
    return `<p>Pour ${goal}&nbsp;:</p>\n<ul>\n${steps}\n</ul>`
  })
  return `${sections.join('\n')}
<p>Une fois votre sélection effectuée, les informations correspondantes apparaîtront ici.</p>`
}

/** Texte fiche lorsqu’aucune cerise / sélection n’est active (tous les modes). */
export const DEFAULT_FICHE_EMPTY: FicheInfoSelection = {
  title: 'Aucune sélection en cours',
  bodyHtml: emptyFicheBodyHtml(ALL_MAP_MODES),
}
