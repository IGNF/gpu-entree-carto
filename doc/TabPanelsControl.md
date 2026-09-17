# TabPanelsControl

Panneau latéral à **4 onglets** (contrôle OpenLayers), à droite de la carte.

**Source :** `src/components/map/TabPanelsControl.vue`  
**Styles :** `src/styles/tab-panels.css`  
**API :** `src/composables/tabPanels.ts`  
**État couches :** `src/composables/managedLayers.ts`  
**Référence :** gpu-client `TabsPanelsControl` + cartes.gouv.fr (TODO panneau latéral)

## Comportement

- **Fermé par défaut** : pile verticale de 4 boutons-onglets **collés** (48×48, ombre sur le groupe, comme zoom +/- sans gutter). Les styles battent `.ol-control button` d’OpenLayers (`1.375em`).
- Pas de bordure / inset blanc sur l’état actif (fond bleu plein).
- **Ouvert** : panneau (~490 px, `--ec-tab-panels-width`: `30.6rem`) à droite ; les boutons sont **collés** au bord gauche du panneau (pas d’écart).
- Clic sur un onglet : active cet onglet et ouvre le panneau ; clic sur l’onglet déjà actif : ferme.
- Un seul onglet actif à la fois.
- À l’ouverture, `.ec-map-shell--tab-panels-open` décale zoom, plein écran et échelle de `--ec-tab-panels-inset` (= largeur panneau) + le même `--ec-widget-gap` qu’au bord de carte lorsque le panneau est fermé.
- Conteneur pleine hauteur avec `pointer-events: none !important` (OpenLayers pose `pointer-events: auto` en inline) ; seuls les enfants (onglets / panneau) reçoivent les clics — sinon zoom / plein écran bas-droite sont masqués.
- Infobulles style geopf au survol (`aria-label` → `::after`, à gauche des boutons) ; masquées si l’onglet est actif.

## Onglets

| #   | Icône                         | Contenu |
| --- | ----------------------------- | ------- |
| 0   | DSFR `fr-icon-map-pin-2-line` | **Informations / localisation** — fiche structurée (`FicheInfoPanel`) ; données brutes (`raw`) en bas si présentes |
| 1   | Remix `ri-map-2-line`         | **Catalogue** — sous-onglets DSFR *Données* ([CatalogLayerTree](./CatalogLayerTree.md)) et *Fonds de cartes* ([BaseLayerRadioList](./BaseLayerRadioList.md)) |
| 2   | Remix `ri-stack-line`         | **Couches de données** — pile des couches cochées dans le catalogue : visibilité, opacité, ordre, retrait |
| 3   | Remix `ri-list-indefinite`    | **Légendes** — légendes des couches visibles de la pile |

Icônes Remix : package `remixicon` (CSS global dans `main.ts`).

## Props

| Prop             | Type                    | Description                             |
| ---------------- | ----------------------- | --------------------------------------- |
| `basePresets`    | `GpuBaseLayerPreset[]`  | Fonds pour le catalogue → Fonds de cartes |
| `baseModelValue` | `GpuBaseLayerId`        | Fond actif (`v-model:base-model-value`) |
| `layerNodes`     | `TreeLayerNode[]`       | Catalogue *Données* / pile / légendes   |
| `layerMapHooks`  | `LayerMapHooks?`        | Callbacks visibilité / opacité → carte (WMS démo) |

## Events

| Event            | Description                                      |
| ---------------- | ------------------------------------------------ |
| `toggle-layer`   | Visibilité carte (`id`, `visible`)               |
| `update:baseModelValue` | Changement de fond de plan                |

## API (`TabPanelsApi`)

Exposée via `provide`, `defineExpose`, et `tabPanelsApiRef` (accès sibling, ex. SearchEngine) :

- `openTab(index)` / `closePanels()`
- `showSelection({ title, bodyHtml?, raw? })` — remplit la fiche info, ouvre l’onglet 0
- `clearSelection()`
- refs : `isOpen`, `activeTab`, `selection`

## Composants panneau

| Composant | Fichier |
| --------- | ------- |
| `LayerCataloguePanel` | `src/components/panels/LayerCataloguePanel.vue` |
| `DataLayersManagerPanel` | [DataLayersManagerPanel.md](./DataLayersManagerPanel.md) |
| `LayerLegendsPanel` | [LayerLegendsPanel.md](./LayerLegendsPanel.md) |

## Intégration localisation

`SearchEngineControl` appelle `showSelection` **avant** de poser le marker (`initialSearch` / accueil → carte), puis recentre hors de la zone couverte par le panneau pour garder la popup geopf visible. GetFeatureInfo branchera plus tard sur la même API.

## Limites actuelles

- Fiche structurée selon sélection : contenu riche à brancher plus tard.
- Opacité / ordre : pile onglet 3 branchée sur hooks ; pas encore grisage zoom gpu-client.
- Légendes `scaleDependant` : URL figée au zoom initial (pas d’écoute zoom OL pour l’instant).
- Pas de permalink couches (hors scope).

## Dépendances

- Enfant de `MapShell` (injection `olMap`)
- Icônes DSFR + Remix Icon
- Composants : `FicheInfoPanel`, `LayerCataloguePanel` (+ `CatalogLayerTree`, `BaseLayerRadioList`), `DataLayersManagerPanel`, `LayerLegendsPanel`, `TreeLayerSwitcher` (pile / légendes)
- Styles catalogue : `src/styles/layer-catalogue.css` (onglets DSFR pleine largeur)
