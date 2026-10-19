[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPrintControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPrintControl.fr.md)

# MapPrintControl

Contrôle d’export de la carte (PDF / PNG / JPEG), porté depuis [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) (`PrintModal.vue`).

**Sources :** `src/components/map/MapPrintControl.vue`, `src/components/map/MapPrintModal.vue`  
**Moteur :** `src/lib/map/print/` (`mapExport`, `printScale`, `cloneMapLayers`, `pngDpi`, `printFicheSnapshot`, `rasterizePrintSupplementPage`)  
**Pages annexes :** `src/components/map/print/` (`MapPrintFicheTerritoryPage`, `MapPrintFicheParcelPage`, `MapPrintLegendsPage`)

## Comportement

- Ouvre une modale DSFR (**modèle d’impression** prédéfini ou réglages personnalisés : format papier, orientation, marges, titre, échelle, DPI).
- **Modèles** (`src/lib/map/print/printTemplates.ts`) : A4 aperçu rapide (96 DPI), A4 impression (300 DPI), A4 paysage, A3 aperçu — pré-calcul des pagination annexes en arrière-plan pour limiter l’attente au changement de gabarit.
- Construit une **prévisualisation** OpenLayers en clonant les couches visibles (attributions + échelle en bas à droite, comme sur la carte principale).
- Pages optionnelles (données via `TabPanelsControl` / `mapPrintPanelsKey`) :
  - **fiche territoire** — une page, contenu de chaque onglet en colonnes (sans UI d’onglets) ;
  - **fiche parcelle** — une page, colonnes Infos / Documents ;
  - **légendes** — une page, titres de groupes + symboles + libellés (sans accordéon).
- **Pagination** au-dessus de l’aperçu (même colonne que le formulaire, à droite) : libellé du type « Page 1 / 1 — Carte » même pour une seule feuille ; boutons précédent / suivant si plusieurs pages ; une page carte + autant de feuilles que nécessaire par annexe (découpage automatique si le contenu dépasse le format papier).
- **Colonne aperçu** : **Ctrl + molette** sur le cadre (hors carte) pour zoomer/dézoomer la feuille et les annexes ; molette seule = défilement ; barres de défilement si le contenu agrandi dépasse le cadre ; la molette sur la carte continue de piloter le zoom OpenLayers.
- Export : PDF multi-pages (`carte-et-annexes.pdf`) ; PNG/JPEG : un fichier par page (`carte - page N.ext`) si plusieurs pages sont cochées.
- N’altère pas la vue carte après export.

## Placement

Colonne geopf bas-gauche, **`order: -2`** — entre le bouton / barre croquis (`order: -3`) et la minimap (`order: -1`). Voir `map-controls.css`.

## Icône

Bouton déclencheur : `fr-icon-printer-line` (DSFR).

## Distinction

- **Impression fiche parcelle (onglet actif)** — bouton « Imprimer » dans `FicheInfoPanel` (`window.print()`) ; la modale carte peut ajouter une page parcelle complète (Infos + Documents) si les données sont chargées.

## Dépendances

- `MapPrintModal` dans `MapShell` (inject `olMap`) ; données fiche/légendes via `mapPrintPanelsRef` (`TabPanelsControl`)
- `@gouvminint/vue-dsfr`, `jspdf`, `html2canvas`, `@vueuse/core`
- Enregistrement vue-dsfr dans `mount.ts` pour l’embed gpu-site
