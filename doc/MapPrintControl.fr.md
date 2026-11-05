[![en](https://img.shields.io/badge/lang-en-red.svg)](MapPrintControl.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](MapPrintControl.fr.md)

# MapPrintControl

Contrôle d’export de la carte (PDF / PNG / JPEG), porté depuis [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) (`PrintModal.vue`).

**Sources :** `src/components/map/MapPrintControl.vue`, `src/components/map/MapPrintModal.vue`  
**Moteur :** `src/lib/map/print/` (`offscreenPrintMapExport`, `waitForMapExportReady`, `mapExport`, `printExportProgress`, `printScale`, `cloneMapLayers`, `pngDpi`, `printFicheSnapshot`, `rasterizePrintSupplementPage`)  
**Pages annexes :** `src/components/map/print/` (`MapPrintFicheTerritoryPage`, `MapPrintFicheParcelPage`, `MapPrintLegendsPage`, `PrintExportProgressOverlay`)

## Comportement

- Ouvre une modale DSFR (**modèle d’impression** prédéfini ou réglages personnalisés : format papier, orientation, marges, titre, échelle, DPI).
- **Modèles** (`src/lib/map/print/printTemplates.ts`) : A4 aperçu rapide (96 DPI), A4 impression (300 DPI), A4 paysage, A3 aperçu — pré-calcul des pagination annexes en arrière-plan pour limiter l’attente au changement de gabarit.
- Construit une **prévisualisation** OpenLayers en clonant les couches visibles (attributions + échelle en bas à droite, comme sur la carte principale).
- Pages optionnelles (données via `TabPanelsControl` / `mapPrintPanelsKey`) :
  - **fiche territoire** — une page, contenu de chaque onglet en colonnes (sans UI d’onglets ; sans titre de section « Documents » ; liens « fiche juridique » SUP retirés à l’impression) ;
  - **fiche parcelle** — une page (Références cadastrales le cas échéant, puis **Règles d’urbanisme** / **Documents couvrant la parcelle**, encarts DSFR informatifs en bas de page) ; espacement renforcé entre cadastre et règles ;
  - **légendes** — titres de groupes + symboles + libellés (sans accordéon) ; par défaut **seules les couches dans la plage de zoom de l’aperçu carte** (les autres sont masquées, sans grisé) ; option **Toutes les légendes** (si « Afficher la légende » est cochée) : toutes les couches avec légende (y compris masquées / hors zoom), **sans grisé** et **sans dépendance au zoom** de l’aperçu. Pages annexes : **retrait intérieur** (~1,6 mm, indépendant de la marge papier) pour limiter les coupures en tête/bas de tranche ; pictos légende un peu plus grands à **300 DPI**.
- **Contenu annexes vs vue carte** : la **fiche territoire** ne dépend pas du pan/zoom de l’aperçu ; la **fiche parcelle** non plus, sauf les pictos de règles **-lowscale** / **-highscale** (seuil ~17) ; les **légendes** dépendent du zoom aperçu sauf en mode « Toutes les légendes ». La pagination de ces annexes est recalculée en **arrière-plan** (sans masquer l’aperçu) quand ce contenu change ; le bandeau « Préparation de l’aperçu… » ne concerne que le **gabarit** (format, marges, DPI) ou la **resync** carte principale → aperçu.
- **Pagination** au-dessus de l’aperçu (même colonne que le formulaire, à droite) : libellé du type « Page 1 / 1 — Carte » même pour une seule feuille ; boutons précédent / suivant si plusieurs pages ; une page carte + autant de feuilles que nécessaire par annexe (découpage automatique si le contenu dépasse le format papier).
- **Colonne aperçu** : **Ctrl + molette** sur le cadre (hors carte) pour zoomer/dézoomer la feuille et les annexes ; molette seule = défilement ; barres de défilement si le contenu agrandi dépasse le cadre ; la molette sur la carte continue de piloter le zoom OpenLayers.
- Export : PDF multi-pages (`carte-et-annexes.pdf`) ; PNG/JPEG : un fichier par page (`carte - page N.ext`) si plusieurs pages sont cochées. Les annexes sont exportées par **capture du cadre d’aperçu** (html2canvas sur la feuille affichée, upscalée au DPI), pour un rendu identique à l’aperçu ; le bloc de mesure hors écran sert uniquement à compter les pages.
- **Vue carte d’aperçu** : copiée depuis la carte principale à la **première** ouverture de la modale ; les réouvertures **réutilisent** la carte d’aperçu et le cache de pagination tant que la vue / les couches n’ont pas changé. Si la carte principale a bougé et que l’aperçu n’a pas été personnalisé, **resynchronisation immédiate** (équivalent **Replacer la carte**, avec bandeau « Préparation de l’aperçu… » semi-transparent pendant le chargement des tuiles — la carte reste visible en dessous). Corps de modale **défilable** si le contenu dépasse la hauteur viewport. Modifier le formulaire (format, marges, titre, DPI, etc.) **ne réinitialise pas** le zoom ni le déplacement de l’aperçu carte. Après un zoom ou un déplacement sur l’aperçu, le bouton secondaire **Replacer la carte** réaligne l’aperçu sur la vue de la carte principale.
- Action principale **Exporter** : lance l’export PDF/PNG/JPEG. N’altère pas la vue carte principale ni la carte d’aperçu visible ; une **carte hors écran** (`offscreenPrintMapExport`) reproduit la même emprise géographique au DPI d’export, avec attente explicite du chargement des tuiles (`waitForMapExportReady`). Titre, échelle et attributions restent composés comme avant à partir du DOM d’aperçu. Pendant le traitement, une **barre de progression** (`PrintExportProgressOverlay`) affiche le pourcentage et le libellé de l’étape en cours (préfixe **Page i/n**, sous-étapes carte hors écran / tuiles / capture annexe / encodage fichier). **Pan/zoom sur l’aperçu carte** ne déclenche plus « Préparation de l’aperçu… » : la pagination des légendes (liée au zoom) est recalculée **au clic sur Exporter** (étapes 1–8 %), puis capture carte / annexes / fichier.
- **WYSIWYG** : page **carte** = même emprise et mêmes couches visibles que l’aperçu, rendu à la résolution d’export ; pages **annexes** = capture du cadre d’aperçu affiché (identique pixel à pixel à l’écran, upscalée au DPI). Le **titre carte** utilise la même typo que le titre « Légendes » (`--print-title-font`, 4,5 mm).

## Pipeline d’export (évolution)

| Phase | Statut | Objectif |
| --- | --- | --- |
| 1 | En place | Carte rasterisée hors écran + attente tuiles + progression UI ; aperçu interactif inchangé. |
| 2 | En place | Encodage PNG (métadonnées DPI), JPEG et assemblage PDF dans un **Web Worker** (`printExport.worker.ts`), repli sur le thread principal si indisponible. |
| 3 | En place | **Préchauffage** des tuiles export (`printMapPrewarm.ts`) en tâche de fond (idle) après ouverture / changement de gabarit. |
| 4 | En place | Cache de rendu carte (`printMapRenderCache.ts`) par emprise + DPI + empreinte des couches visibles. |

## Placement

Colonne geopf bas-gauche, **`order: -2`** — entre le bouton / barre croquis (`order: -3`) et la minimap (`order: -1`). Voir `map-controls.css`.

## Icône

Bouton déclencheur : `fr-icon-printer-line` (DSFR).

## Distinction

- **Impression depuis la fiche info** — boutons « Imprimer » parcelle / territoire dans `FicheInfoPanel` ouvrent la modale carte avec la fiche correspondante précochée (autre fiche décochée).

## Dépendances

- `MapPrintModal` dans `MapShell` (inject `olMap`) ; données fiche/légendes via `mapPrintPanelsRef` (`TabPanelsControl`)
- `@gouvminint/vue-dsfr`, `pdf-lib`, `html2canvas`, `@vueuse/core`
- Enregistrement vue-dsfr dans `mount.ts` pour l’embed gpu-site
