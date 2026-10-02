[![en](https://img.shields.io/badge/lang-en-red.svg)](TabPanelsControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](TabPanelsControl.fr.md)

# TabPanelsControl

Panneau latéral à **4 onglets**, à droite de la carte. Seule la **barre d’onglets** est un contrôle OpenLayers ; le contenu du panneau est hors `.ol-control`.

**Source :** `src/components/map/TabPanelsControl.vue`  
**Styles :** `src/styles/tab-panels.css`  
**Constantes de gabarit :** `src/lib/map/tabPanelsLayout.ts`  
**API :** `src/composables/tabPanels.ts`  
**État couches :** `src/composables/managedLayers.ts`  
**Référence :** gpu-client `TabsPanelsControl` + cartes.gouv.fr (TODO panneau latéral)

## Architecture DOM

| Nœud | Rôle |
| ---- | ---- |
| `ec-tab-panels-shell` | Overlay sur le shell carte ; porte la surface contenu (`is-open` quand la feuille est visible). `data-ec-tab-panels-layout` : `side` (bureau) ou `bottom` (mobile, à venir). |
| `ec-tab-panels__tabs-control` | **Seul** nœud passé à `ol/control/Control` — OpenLayers ajoute `.ol-control` ; les boutons-onglets surchargent `ol.css` (`1.375em`). |
| `ec-tab-panels__surface` | Panneau DSFR (catalogue, fiche, couches, légendes) — **pas** sous `.ol-control`. |

## Comportement

- **Fermé par défaut** : pile verticale de 4 boutons-onglets **collés** (48×48, ombre sur le groupe, comme zoom +/- sans gutter).
- Pas de bordure / inset blanc sur l’état actif (fond bleu plein).
- **Ouvert** : panneau (~490 px, `--ec-tab-panels-width`: `30.6rem`) à droite ; les boutons sont **collés** au bord gauche du panneau (pas d’écart).
- Clic sur un onglet : active cet onglet et ouvre le panneau ; clic sur l’onglet déjà actif : ferme.
- Un seul onglet actif à la fois.
- À l’ouverture, `.ec-map-shell--tab-panels-open` décale zoom, plein écran et échelle de `--ec-tab-panels-inset` (= largeur panneau) + le même `--ec-widget-gap` qu’au bord de carte lorsque le panneau est fermé.
- Contrôle onglets : `pointer-events: none !important` sur `.ol-control`, auto sur la colonne d’onglets — zoom / plein écran bas-droite restent cliquables.
- Surface panneau : `pointer-events: auto` sur `ec-tab-panels__surface` uniquement à l’ouverture.

## Mobile (≤ 48rem)

- **`data-ec-tab-panels-layout="bottom"`** sur `ec-tab-panels-shell` (détection `matchMedia`, classe `ec-map-shell--tab-panels-layout-bottom` sur le shell carte).
- Barre d’onglets **horizontale** en bas (`ec-tab-panels__tabs-control` dans `#gpu-map`), au-dessus du `safe-area-inset-bottom`.
- Feuille **`ec-tab-panels__surface`** : hauteur pilotée par **`--ec-tab-panels-sheet-fraction`** (snaps **0 / 35 / 70 / 98 %**), poignée **`ec-tab-panels__sheet-grab`** (glissement vertical).
- Plafond **`--ec-tab-panels-max-sheet-height`** = zone carte (`100cqb`) − safe top − **`--ec-tab-panels-site-header-offset`** (mesure si l’en-tête chevauche la carte).
- Ouverture d’un onglet (tap) : snap **70 %** ; ouverture auto (click info, recherche lieu, `showSelection`) : snap **aperçu 35 %** (`TAB_PANELS_AUTO_OPEN_SNAP`) ; re-clic : fermeture (0 %). Échelle / attributions remontées via **`--ec-bottom-widgets-lift`** quand la feuille est ouverte.
- **Barre basse** (horizontal) : à **gauche**, **croquis** (barre verticale au-dessus du bouton), **minimap**, **territoires** ; à **droite** (dans la barre, marge réservée pour la colonne zoom), les **4 onglets** du panneau ; **zoom** + / − et **plein écran** en colonne à **droite**, au-dessus de la barre (`ec-tab-panels__viewport-stack`). `useMobileBottomBarGeopf` déplace la racine croquis entière + boutons geopf.
- **Réhaussés** au-dessus de la barre (`--ec-mobile-footer-stack-base`, hauteur barre seule — **fixe** quand la feuille bouge) : mini-carte ouverte, **attributions**, **échelle**.
- **Recherche lieu** : pleine largeur en haut ; **Parcelle / Territoire** (icônes) juste en dessous.
- **Slider modale** (`ec-tab-panels__modal-slider`) : poignée centrée en haut de la feuille pour changer de snap.
- Logique : `useTabPanelsLayout`, `useTabPanelsMobileSheet` ; constantes `tabPanelsLayout.ts`.
- Passage **bureau → mobile** avec panneau déjà ouvert : feuille ouverte au snap **aperçu 35 %** (même onglet actif) ; `--ec-tab-panels-inset` reste **0** (attributions / échelle alignées sur la colonne zoom, pas sur la largeur panneau bureau). Barre d’onglets : padding droit = gap seul (zoom / plein écran flottent au-dessus).
- Infobulles style geopf au survol (`aria-label` → `::after`, à gauche des boutons) ; masquées si l’onglet est actif.

## Onglets

| #   | Icône                         | Contenu                                                                                                                                                      |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | DSFR `fr-icon-map-pin-2-line` | **Informations / localisation** — `FicheInfoPanel` (présentation Parcelle / Territoire, modal références cadastrales, chargement différé des onglets) ; config GPU puis `/api/fiche-info` si cerise |
| 1   | Remix `ri-map-2-line`         | **Catalogue** — sous-onglets DSFR _Données_ ([CatalogLayerTree](./CatalogLayerTree.fr.md)) et _Fonds de cartes_ ([BaseLayerRadioList](./BaseLayerRadioList.fr.md)) |
| 2   | Remix `ri-stack-line`         | **Couches de données** — pile des couches cochées dans le catalogue : visibilité, opacité, ordre, retrait                                                    |
| 3   | Remix `ri-list-indefinite`    | **Légendes** — légendes des couches visibles de la pile                                                                                                      |

Icônes Remix : package `remixicon` (CSS global dans `main.ts`).

## Props

| Prop             | Type                   | Description                                       |
| ---------------- | ---------------------- | ------------------------------------------------- |
| `basePresets`    | `GpuBaseLayerPreset[]` | Fonds pour le catalogue → Fonds de cartes         |
| `baseModelValue` | `GpuBaseLayerId`       | Fond actif (`v-model:base-model-value`)           |
| `layerNodes`     | `TreeLayerNode[]`      | Catalogue _Données_ / pile / légendes             |
| `catalogLayersLoading` | `boolean`        | `true` tant que `LAYER_CONFIG` n’est pas prêt (roue dans le catalogue) |
| `layerMapHooks`  | `LayerMapHooks?`       | Callbacks visibilité / opacité → carte (WMS démo) |

## Events

| Event                   | Description                        |
| ----------------------- | ---------------------------------- |
| `toggle-layer`          | Visibilité carte (`id`, `visible`) |
| `update:baseModelValue` | Changement de fond de plan         |

## API (`TabPanelsApi`)

Exposée via `provide`, `defineExpose`, et `tabPanelsApiRef` (accès sibling, ex. SearchEngine) :

- `openTab(index)` / `closePanels()`
- `openLegendForLayer(layerId)` — onglet Légendes, déplie la couche et scroll (voir [LayerLegendsPanel](./LayerLegendsPanel.fr.md))
- `showSelection({ title, bodyHtml?, raw? })` — remplit la fiche info, ouvre l’onglet 0
- `clearSelection()`
- refs : `isOpen`, `activeTab`, `selection`

## Composants panneau

| Composant                | Fichier                                                  |
| ------------------------ | -------------------------------------------------------- |
| `LayerCataloguePanel`    | `src/components/panels/LayerCataloguePanel.vue`          |
| `DataLayersManagerPanel` | [DataLayersManagerPanel.md](./DataLayersManagerPanel.fr.md) |
| `LayerLegendsPanel`      | [LayerLegendsPanel.md](./LayerLegendsPanel.fr.md)           |

## Intégration localisation

`SearchEngineControl` appelle `showSelection` **avant** de poser le marker (`initialSearch` / accueil → carte), puis recentre hors de la zone couverte par le panneau pour garder la popup geopf visible. GetFeatureInfo branchera plus tard sur la même API.

## Limites actuelles

- Fiche structurée selon sélection : contenu riche à brancher plus tard.
- Opacité / ordre : pile onglet 3 branchée sur hooks ; pas encore grisage zoom gpu-client.
- Légendes `scaleDependant` : URL figée au zoom initial (pas d’écoute zoom OL pour l’instant).
- Permalink couches : voir [MapPermalink.fr.md](./MapPermalink.fr.md) (catalogue + pile Couches de données).

## Dépendances

- Enfant de `MapShell` (injection `olMap`)
- Icônes DSFR + Remix Icon
- Composants : `FicheInfoPanel`, `LayerCataloguePanel` (+ `CatalogLayerTree`, `BaseLayerRadioList`), `DataLayersManagerPanel`, `LayerLegendsPanel`, `TreeLayerSwitcher` (pile / légendes)
- Styles catalogue : `src/styles/layer-catalogue.css` (onglets DSFR pleine largeur)
