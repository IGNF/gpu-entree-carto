[![en](https://img.shields.io/badge/lang-en-red.svg)](icone-references.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](icone-references.fr.md)

# Référence des icônes

Inventaire des pictogrammes utilisés dans **entree-carto** (`src/` et contrôles geopf bundlés).  
Colonnes : **aperçu** (SVG dans `doc/img/icon-previews/`), **libellé**, **classe HTML**, **catalogue**, **URL**.

Aperçus : `npm run doc:icon-previews` (`@gouvfr/dsfr`, `remixicon`, assets projet). Certains glyphes DSFR-only utilisent un SVG Remix de substitution ; versionner les aperçus avec la doc.

## Formats d’URL

| Catalogue | Préfixe de classe | URL |
| --------- | ----------------- | --- |
| **DSFR** | `fr-icon-*` | `https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=` + nom **sans** `fr-icon-` (ex. `fr-icon-arrow-left-line` → `query=arrow-left-line`) |
| **Remix Icon** | `ri-*` | `https://remixicon.com/icon/` + nom **sans** `ri-` (ex. `ri-arrow-left-line` → `…/arrow-left-line`) |
| **Custom** | `ri-*` (projet) | Asset local ou glyphe privé — pas de fiche publique (voir ci-dessous) |
| **SVG inline** | — | Intégré dans Vue — pas de classe DSFR/Remix |

Feuilles de style : DSFR `icons.min.css` (`main.ts`, démo) ; Remix `remixicon.css` + `src/assets/custom-icons/custom-remix-icons.css` (croquis / éditeur de géométrie). Les boutons geopf combinent souvent DSFR et `gpf-btn` (voir [INTEGRATION.fr.md](./INTEGRATION.fr.md)).

---

## Onglets latéraux (`TabPanelsControl.vue`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/dsfr/map-pin-2-line.svg" width="24" height="24" alt="" /> | Onglet informations | `fr-icon-map-pin-2-line` | DSFR | [map-pin-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=map-pin-2-line) |
| <img src="./img/icon-previews/remix/map-2-line.svg" width="24" height="24" alt="" /> | Onglet catalogue | `ri-map-2-line` | Remix | [map-2-line](https://remixicon.com/icon/map-2-line) |
| <img src="./img/icon-previews/remix/stack-line.svg" width="24" height="24" alt="" /> | Onglet couches | `ri-stack-line` | Remix | [stack-line](https://remixicon.com/icon/stack-line) |
| <img src="./img/icon-previews/remix/list-indefinite.svg" width="24" height="24" alt="" /> | Onglet légendes | `ri-list-indefinite` | Remix | [list-indefinite](https://remixicon.com/icon/list-indefinite) |
| <img src="./img/icon-previews/remix/fullscreen-line.svg" width="24" height="24" alt="" /> | Barre carte mobile — entrer en plein écran | `ri-fullscreen-line` | Remix | [fullscreen-line](https://remixicon.com/icon/fullscreen-line) |
| — | Barre carte mobile — quitter le plein écran | `ri-fullscreen-exit-line` | Remix | [fullscreen-exit-line](https://remixicon.com/icon/fullscreen-exit-line) |

---

## Fiche informations (`FicheInfoPanel.vue`, `FicheCadastreReferencesModal.vue`, `ficheInfoHtml.ts`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/remix/information-line.svg" width="24" height="24" alt="" /> | Titre de section (info) | `ri-information-line` | Remix | [information-line](https://remixicon.com/icon/information-line) |
| <img src="./img/icon-previews/remix/arrow-right-line.svg" width="24" height="24" alt="" /> | Ouvrir références cadastrales | `ri-arrow-right-line` | Remix | [arrow-right-line](https://remixicon.com/icon/arrow-right-line) |
| <img src="./img/icon-previews/remix/arrow-left-line.svg" width="24" height="24" alt="" /> | Retour parcelle | `ri-arrow-left-line` | Remix | [arrow-left-line](https://remixicon.com/icon/arrow-left-line) |
| <img src="./img/icon-previews/remix/refresh-line.svg" width="24" height="24" alt="" /> | Recharger l’onglet | `ri-refresh-line` | Remix | [refresh-line](https://remixicon.com/icon/refresh-line) |
| <img src="./img/icon-previews/remix/printer-line.svg" width="24" height="24" alt="" /> | Imprimer (territoire) | `ri-printer-line` | Remix | [printer-line](https://remixicon.com/icon/printer-line) |
| <img src="./img/icon-previews/dsfr/refresh-line.svg" width="24" height="24" alt="" /> | Spinner chargement (fragment HTML) | `fr-icon-refresh-line` | DSFR | [refresh-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=refresh-line) |
| <img src="./img/icon-previews/dsfr/information-line.svg" width="24" height="24" alt="" /> | Modale — info | `fr-icon-information-line` | DSFR | [information-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=information-line) |
| <img src="./img/icon-previews/dsfr/close-line.svg" width="24" height="24" alt="" /> | Modale — fermer | `fr-icon-close-line` | DSFR | [close-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-line) |
| <img src="./img/icon-previews/remix/file-copy-line.svg" width="24" height="24" alt="" /> | Copier les références | `ri-file-copy-line` | Remix | [file-copy-line](https://remixicon.com/icon/file-copy-line) |

---

## Catalogue de couches & légendes (`LayerCataloguePanel.vue`, `LayerLegendsPanel.vue`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/remix/map-2-line.svg" width="24" height="24" alt="" /> | Titre panneau catalogue | `ri-map-2-line` | Remix | [map-2-line](https://remixicon.com/icon/map-2-line) |
| <img src="./img/icon-previews/remix/loader-4-line.svg" width="24" height="24" alt="" /> | Chargement catalogue | `ri-loader-4-line` | Remix | [loader-4-line](https://remixicon.com/icon/loader-4-line) |
| <img src="./img/icon-previews/remix/list-indefinite.svg" width="24" height="24" alt="" /> | Titre panneau légendes | `ri-list-indefinite` | Remix | [list-indefinite](https://remixicon.com/icon/list-indefinite) |

---

## Gestionnaire de couches (`DataLayersManagerPanel.vue`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/remix/stack-line.svg" width="24" height="24" alt="" /> | Titre du panneau | `ri-stack-line` | Remix | [stack-line](https://remixicon.com/icon/stack-line) |
| <img src="./img/icon-previews/remix/separator.svg" width="24" height="24" alt="" /> | Séparateur de couche | `ri-separator` | Remix | [separator](https://remixicon.com/icon/separator) |
| <img src="./img/icon-previews/remix/list-unordered.svg" width="24" height="24" alt="" /> | Style liste | `ri-list-unordered` | Remix | [list-unordered](https://remixicon.com/icon/list-unordered) |
| <img src="./img/icon-previews/remix/list-indefinite.svg" width="24" height="24" alt="" /> | Ouvrir la légende | `ri-list-indefinite` | Remix | [list-indefinite](https://remixicon.com/icon/list-indefinite) |
| <img src="./img/icon-previews/remix/drag-move-2-fill.svg" width="24" height="24" alt="" /> | Poignée de déplacement | `ri-drag-move-2-fill` | Remix | [drag-move-2-fill](https://remixicon.com/icon/drag-move-2-fill) |
| <img src="./img/icon-previews/remix/eye-line.svg" width="24" height="24" alt="" /> | Visible | `ri-eye-line` | Remix | [eye-line](https://remixicon.com/icon/eye-line) |
| <img src="./img/icon-previews/remix/eye-off-line.svg" width="24" height="24" alt="" /> | Masqué | `ri-eye-off-line` | Remix | [eye-off-line](https://remixicon.com/icon/eye-off-line) |
| <img src="./img/icon-previews/remix/delete-bin-line.svg" width="24" height="24" alt="" /> | Supprimer la couche | `ri-delete-bin-line` | Remix | [delete-bin-line](https://remixicon.com/icon/delete-bin-line) |
| <img src="./img/icon-previews/remix/contrast-fill.svg" width="24" height="24" alt="" /> | Opacité | `ri-contrast-fill` | Remix | [contrast-fill](https://remixicon.com/icon/contrast-fill) |

---

## Arbre catalogue & fonds (`CatalogLayerTree.vue`, `BaseLayerRadioList.vue`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/dsfr/arrow-right-s-line.svg" width="24" height="24" alt="" /> | Déplier un groupe | `fr-icon-arrow-right-s-line` | DSFR | [arrow-right-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-right-s-line) |
| <img src="./img/icon-previews/dsfr/arrow-down-s-line.svg" width="24" height="24" alt="" /> | Replier un groupe | `fr-icon-arrow-down-s-line` | DSFR | [arrow-down-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-down-s-line) |
| <img src="./img/icon-previews/dsfr/arrow-down-s-line.svg" width="24" height="24" alt="" /> | Afficher la description | `fr-icon-arrow-down-s-line` | DSFR | [arrow-down-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-down-s-line) |
| <img src="./img/icon-previews/dsfr/arrow-up-s-line.svg" width="24" height="24" alt="" /> | Masquer la description | `fr-icon-arrow-up-s-line` | DSFR | [arrow-up-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-up-s-line) |

---

## Mode carte (`MapModeSelector.vue`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/custom/parcelle.svg" width="24" height="24" alt="" /> | Parcelle | `ec-icon-parcelle` | Custom | `src/assets/custom-icons/parcelle.svg` (`custom-remix-icons.css`) |
| <img src="./img/icon-previews/dsfr/france-fill.svg" width="24" height="24" alt="" /> | Territoire | `fr-icon-france-fill` | DSFR | [france-fill](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=france-fill) |

---

## Territoires (`TerritoriesControl.vue`)

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/dsfr/close-line.svg" width="24" height="24" alt="" /> | Fermer le panneau | `fr-icon-close-line` (+ `gpf-btn-icon-close`) | DSFR | [close-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-line) |

---

## Croquis / éditeur de géométrie (`geometryToolIcons.ts`, `SketchFeatureStylePopup.ts`, `SketchMeasureController.ts`)

Correspondance modificateur BEM barre d’outils → classe Remix dans `src/geometry-editor/geometryToolIcons.ts`.

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/remix/tools-fill.svg" width="24" height="24" alt="" /> | Menu outils | `ri-tools-fill` | Remix | [tools-fill](https://remixicon.com/icon/tools-fill) |
| <img src="./img/icon-previews/remix/ruler-line.svg" width="24" height="24" alt="" /> | Mesurer une distance | `ri-ruler-line` | Remix | [ruler-line](https://remixicon.com/icon/ruler-line) |
| <img src="./img/icon-previews/remix/custom-size.svg" width="24" height="24" alt="" /> | Mesurer une surface | `ri-custom-size` | Remix | [custom-size](https://remixicon.com/icon/custom-size) |
| <img src="./img/icon-previews/remix/save-line.svg" width="24" height="24" alt="" /> | Enregistrer | `ri-save-line` | Remix | [save-line](https://remixicon.com/icon/save-line) |
| <img src="./img/icon-previews/remix/corner-up-left-line.svg" width="24" height="24" alt="" /> | Annuler | `ri-corner-up-left-line` | Remix | [corner-up-left-line](https://remixicon.com/icon/corner-up-left-line) |
| <img src="./img/icon-previews/remix/corner-up-right-line.svg" width="24" height="24" alt="" /> | Rétablir | `ri-corner-up-right-line` | Remix | [corner-up-right-line](https://remixicon.com/icon/corner-up-right-line) |
| <img src="./img/icon-previews/remix/map-pin-5-line.svg" width="24" height="24" alt="" /> | Point | `ri-map-pin-5-line` | Remix | [map-pin-5-line](https://remixicon.com/icon/map-pin-5-line) |
| <img src="./img/icon-previews/custom/draw-line.svg" width="24" height="24" alt="" /> | Ligne | `ri-draw-line` | Custom | `src/assets/custom-icons/draw-line.svg` (masque CSS dans `custom-remix-icons.css`) |
| <img src="./img/icon-previews/remix/pentagon-line.svg" width="24" height="24" alt="" /> | Polygone | `ri-pentagon-line` | Remix | [pentagon-line](https://remixicon.com/icon/pentagon-line) |
| <img src="./img/icon-previews/remix/rectangle-line.svg" width="24" height="24" alt="" /> | Rectangle | `ri-rectangle-line` | Remix | [rectangle-line](https://remixicon.com/icon/rectangle-line) |
| <img src="./img/icon-previews/remix/circle-line.svg" width="24" height="24" alt="" /> | Cercle / disque | `ri-circle-line` | Remix | [circle-line](https://remixicon.com/icon/circle-line) |
| <img src="./img/icon-previews/remix/text.svg" width="24" height="24" alt="" /> | Texte | `ri-text` | Remix | [text](https://remixicon.com/icon/text) |
| <img src="./img/icon-previews/remix/edit-line.svg" width="24" height="24" alt="" /> | Modifier | `ri-edit-line` | Remix | [edit-line](https://remixicon.com/icon/edit-line) |
| <img src="./img/icon-previews/remix/shape-line.svg" width="24" height="24" alt="" /> | Modifier la forme | `ri-shape-line` | Remix | [shape-line](https://remixicon.com/icon/shape-line) |
| <img src="./img/icon-previews/remix/drag-move-2-line.svg" width="24" height="24" alt="" /> | Déplacer | `ri-drag-move-2-line` | Remix | [drag-move-2-line](https://remixicon.com/icon/drag-move-2-line) |
| <img src="./img/icon-previews/remix/restart-line.svg" width="24" height="24" alt="" /> | Pivoter | `ri-restart-line` | Remix | [restart-line](https://remixicon.com/icon/restart-line) |
| <img src="./img/icon-previews/remix/palette-line.svg" width="24" height="24" alt="" /> | Style | `ri-palette-line` | Remix | [palette-line](https://remixicon.com/icon/palette-line) |
| <img src="./img/icon-previews/remix/close-circle-line.svg" width="24" height="24" alt="" /> | Supprimer l’entité | `ri-close-circle-line` | Remix | [close-circle-line](https://remixicon.com/icon/close-circle-line) |
| <img src="./img/icon-previews/remix/delete-bin-6-fill.svg" width="24" height="24" alt="" /> | Tout effacer | `ri-delete-bin-6-fill` | Remix | [delete-bin-6-fill](https://remixicon.com/icon/delete-bin-6-fill) |
| <img src="./img/icon-previews/remix/upload-line.svg" width="24" height="24" alt="" /> | Exporter | `ri-upload-line` | Remix | [upload-line](https://remixicon.com/icon/upload-line) |
| <img src="./img/icon-previews/remix/download-line.svg" width="24" height="24" alt="" /> | Importer | `ri-download-line` | Remix | [download-line](https://remixicon.com/icon/download-line) |
| <img src="./img/icon-previews/remix/settings-3-line.svg" width="24" height="24" alt="" /> | Paramètres | `ri-settings-3-line` | Remix | [settings-3-line](https://remixicon.com/icon/settings-3-line) |
| <img src="./img/icon-previews/remix/alert-line.svg" width="24" height="24" alt="" /> | Badge enregistrement — non sauvegardé | `ri-alert-line` | Remix | [alert-line](https://remixicon.com/icon/alert-line) |
| <img src="./img/icon-previews/remix/checkbox-circle-fill.svg" width="24" height="24" alt="" /> | Badge enregistrement — sauvegardé | `ri-checkbox-circle-fill` | Remix | [checkbox-circle-fill](https://remixicon.com/icon/checkbox-circle-fill) |
| <img src="./img/icon-previews/remix/corner-up-left-line.svg" width="24" height="24" alt="" /> <img src="./img/icon-previews/remix/corner-up-right-line.svg" width="24" height="24" alt="" /> <img src="./img/icon-previews/remix/delete-bin-6-line.svg" width="24" height="24" alt="" /> | Popup style — annuler / rétablir / supprimer | `ri-corner-up-left-line`, `ri-corner-up-right-line`, `ri-delete-bin-6-line` | Remix | [corner-up-left-line](https://remixicon.com/icon/corner-up-left-line), [corner-up-right-line](https://remixicon.com/icon/corner-up-right-line), [delete-bin-6-line](https://remixicon.com/icon/delete-bin-6-line) |
| <img src="./img/icon-previews/dsfr/delete-line.svg" width="24" height="24" alt="" /> | Popup mesure — supprimer | `fr-icon-delete-line` | DSFR | [delete-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=delete-line) |

---

## Recherche Géoplateforme (`geopf-extensions-openlayers` — bundle)

Non maintenu dans `src/` ; classes visibles dans `dist/entree-carto-search-engine.js`. Repéré ici car [SearchEngineControl](./SearchEngineControl.fr.md) les embarque.

| Aperçu | Libellé | Classe HTML | Catalogue | URL |
| ------- | ------- | ------------ | --------- | --- |
| <img src="./img/icon-previews/dsfr/search-line.svg" width="24" height="24" alt="" /> | Ouvrir la recherche / valider | `fr-icon-search-line` | DSFR | [search-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=search-line) |
| <img src="./img/icon-previews/dsfr/map-pin-2-line.svg" width="24" height="24" alt="" /> | Résultat par défaut / adresse | `fr-icon-map-pin-2-line` | DSFR | [map-pin-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=map-pin-2-line) |
| <img src="./img/icon-previews/dsfr/history-line.svg" width="24" height="24" alt="" /> | Entrée historique | `fr-icon-history-line` | DSFR | [history-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=history-line) |
| <img src="./img/icon-previews/dsfr/france-line.svg" width="24" height="24" alt="" /> | Résultat administratif | `fr-icon-france-line` | DSFR | [france-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=france-line) |
| — | Hydrographie | `fr-icon-ign-mer` | DSFR | [ign-mer](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=ign-mer) |
| <img src="./img/icon-previews/dsfr/subway-line.svg" width="24" height="24" alt="" /> | Transport / gare | `fr-icon-subway-line` | DSFR | [subway-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=subway-line) |
| <img src="./img/icon-previews/dsfr/plane-line.svg" width="24" height="24" alt="" /> | Aérien | `fr-icon-plane-line` | DSFR | [plane-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=plane-line) |
| <img src="./img/icon-previews/dsfr/ship-2-line.svg" width="24" height="24" alt="" /> | Maritime / port | `fr-icon-ship-2-line` | DSFR | [ship-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=ship-2-line) |
| <img src="./img/icon-previews/dsfr/parking-box-line.svg" width="24" height="24" alt="" /> | Parking | `fr-icon-parking-box-line` | DSFR | [parking-box-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=parking-box-line) |
| <img src="./img/icon-previews/dsfr/bike-line.svg" width="24" height="24" alt="" /> | Vélo | `fr-icon-bike-line` | DSFR | [bike-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=bike-line) |
| <img src="./img/icon-previews/dsfr/arrow-up-s-line.svg" width="24" height="24" alt="" /> | Basculer recherche avancée | `fr-icon-arrow-up-s-line` | DSFR | [arrow-up-s-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=arrow-up-s-line) |
| <img src="./img/icon-previews/dsfr/close-circle-fill.svg" width="24" height="24" alt="" /> | Effacer le champ | `fr-icon-close-circle-fill` | DSFR | [close-circle-fill](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-circle-fill) |
| <img src="./img/icon-previews/dsfr/crosshair-2-line.svg" width="24" height="24" alt="" /> | Géolocalisation | `fr-icon-crosshair-2-line` | DSFR | [crosshair-2-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=crosshair-2-line) |
| <img src="./img/icon-previews/dsfr/close-line.svg" width="24" height="24" alt="" /> | Fermer popup / panneau | `fr-icon-close-line` | DSFR | [close-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=close-line) |
| <img src="./img/icon-previews/dsfr/delete-line.svg" width="24" height="24" alt="" /> | Supprimer repère / mesure | `fr-icon-delete-line` | DSFR | [delete-line](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone/rechercher-une-icone?query=delete-line) |

**Zoom**, **plein écran**, **minimap** : pictos geopf `gpf-btn` via CSS `::after` (pas de `fr-icon-*` / `ri-*` dans les sources entree-carto).

---

## Maintenance

Lors de l’ajout ou la modification d’un pictogramme dans `src/` :

1. Privilégier un nom DSFR ou Remix déjà listé ici.
2. Mettre à jour ce fichier et [icone-references.md](./icone-references.md) dans le même changement.
3. Exécuter `npm run doc:icon-previews` et versionner `doc/img/icon-previews/` (colonne Aperçu).
4. Pour une évolution geopf seule, actualiser la section **Recherche Géoplateforme** après rebuild de `dist/entree-carto-search-engine.js` si les classes ont changé en amont.
