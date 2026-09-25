[![en](https://img.shields.io/badge/lang-en-red.svg)](LayerLegendsPanel.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](LayerLegendsPanel.fr.md)

# LayerLegendsPanel

Onglet **Légendes** du panneau latéral : symboles des couches **visibles** dans la pile « Couches de données ».

**Source :** `src/components/panels/LayerLegendsPanel.vue`  
**Utilisé dans :** [TabPanelsControl](./TabPanelsControl.fr.md) (onglet 3)

## Props

| Prop     | Type             | Description                                                                                                                                |
| -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `layers` | `ManagedLayer[]` | Pile **Couches de données** (`visible` + légende) + couches **`onlyLegend`** actives sur la carte (`legendLayers` dans `useManagedLayers`) |

## Comportement

- Titre avec icône Remix `ri-list-indefinite` (aligné sur le bouton d’onglet).
- **Une section DSFR `fr-accordion` par couche**, regroupées dans un conteneur `fr-accordions-group` (démo [Accordéon DSFR](https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/accordeon/demonstration-de-l-accordeon)) : styles `@gouvfr/dsfr/dist/component/accordion/accordion.min.css` + bouton `fr-accordion__btn` (chevron natif). Surcharges limitées à `layer-legends.css` pour neutraliser `.ol-control button` (OpenLayers).
- **Par défaut** : toutes les sections sont repliées (titres seuls).
- Bouton **Légendes** dans [DataLayersManagerPanel](./DataLayersManagerPanel.fr.md) → `openLegendForLayer(id)` : ouvre l’onglet, **déplie** la couche concernée et **scroll** pour placer son titre en haut du panneau.
- Contenu déplié : liste d’entrées `LegendItem` (`title`, une ou plusieurs images **pct / lin / surf** sur la même ligne, ordre gpu-client).
- **`onlyLegend: true`** : absent du sélecteur catalogue ; ligne dans **Couches de données** si active ; légende ici (sans doublon si déjà dans la pile).
- **Dédoublonnage** : une entrée déjà affichée (même libellé + mêmes symboles) n’est pas répétée ; un second accordéon au même **titre** et à la **même légende** est masqué (`dedupeLegendLayersForPanel`).
- **Hors plage de zoom** LAYER_CONFIG : accordéon grisé (`ec-not-in-zoom-range`, même règle que le catalogue).
- Pas de réglage d’opacité ici (réservé à [DataLayersManagerPanel](./DataLayersManagerPanel.fr.md)).
- URLs d’images : **`legendImageDetailDirectory`** (injecté dans `gpu.config` par `gpu-client-config.js`, aussi fusionné dans `@/lib/config`) + chemin relatif de l’image + `.png`, comme gpu-client `LegendImages#getUrl`.
- Symboles dérivés de `LEGEND_CONFIG` / `LEGEND_REFERENCES` (`gpuLegendItems.ts`, aligné gpu-client `CreateTreeLayerSwitcherItems`) : chemins filtrés `info_surf/05`, sous-filtres `hasfilter2`, blocs « other », etc.
- **`scaleDependant`** : suffixe `-lowscale` / `-highscale` recalculé à partir du **zoom courant** de la carte (écoute `change:resolution` sur la vue OL).

## Dépendances

- Types : `@/types/stubs` (`LegendItem`), `@/composables/managedLayers`
- Config : `legendImageDetailDirectory` dans `gpu.config` après chargement du script GPU
