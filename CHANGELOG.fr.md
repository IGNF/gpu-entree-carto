# Journal des modifications

[![en](https://img.shields.io/badge/lang-en-red.svg)](CHANGELOG.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](CHANGELOG.fr.md)

Toutes les évolutions notables du projet sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Non publié]

### Ajouté

- **Démo croquis** — option `showSettings` sur `mountSketch` (roue crantée, réglages à chaud) ; `setOptions` / `resetOptions` sur le handle ; route `/sketch` activée.

- **TabPanelsControl (mobile)** — bottom sheet (snaps 0 / 35 / 70 / 98 %), barre horizontale (onglets + zoom / plein écran), poignée, safe areas et décalage en-tête site ; composables `useTabPanelsLayout` / `useTabPanelsMobileSheet`, `useMapViewportControls`.
- **Référence des icônes** — `doc/icone-references.md` / `.fr.md` (classes DSFR / Remix, URLs catalogue, aperçus SVG dans `doc/img/icon-previews/`) ; `npm run doc:icon-previews` ; règle Cursor pour maintenir la doc à chaque changement de pictogramme.
- **MapModeSelector** — commutateur radio Parcelle / Territoire (haut-droite), sync permalink `mode=1|2` via `provideMapMode()`.
- **Permalink carte** — fragment URL type gpu-client (`lon`, `lat`, `z`, `tile`, `mlon`, `mlat`, clés couche) via `MapPermalinkSync` + pont `TabPanelsControl`.
- **ClickInfoControl** — clic carte permanent (inactif pendant les outils croquis) remplit l’onglet fiche via `ficheInfoService` (API ou APICarto) ; curseur composite « info ».
- **Fiche depuis la recherche** — `SearchEngineControl` charge la fiche parcelle/document après une recherche geopf selon le mode carte.
- Fichiers de gouvernance open source : README, CONTRIBUTING, CODING, CODE_OF_CONDUCT, CHANGELOG, ROADMAP.
- Prise en charge de `useMinimified` sur toutes les routes démo (accueil, carte, geometry-editor, sketch) avec chargement des bundles `dist/`.
- Documentation bilingue : anglais `*.md` et français `*.fr.md` à la racine et dans `doc/`.

### Modifié

- **Chrome carte mobile** — autocomplétion / recherche avancée au-dessus des modes Parcelle–Territoire (empilement + `attachStandalonePopoverSync`) ; panneau territoires entre le sélecteur de mode et la pile zoom (`tiles: 4`) ; aperçu minimap en `position: fixed` ; barre croquis scrollable et hauteur plafonnée ; **4 onglets du panneau alignés à droite** dans la barre basse (outils geopf à gauche).
- **Contrôles carte** — tokens `--ec-map-control-*` (picto bleu / fond blanc inactif, picto blanc / fond bleu actif) pour geopf, onglets TabPanels, croquis et zoom mobile.
- **Plein écran** — cible `.ec-map-shell` (geopf + barre mobile) pour conserver le panneau latéral ; mobile : bascule `ri-fullscreen-line` / `ri-fullscreen-exit-line` ; pseudo plein écran iOS.
- **TabPanels mobile** — croquis : colonne entre mode et bouton toggle (`--ec-mobile-sketch-toolbar-*-inset`, sans double `btn-size` en bas).
- **TabPanels mobile** — remesure `--ec-mobile-map-viewport-top` à la sortie plein écran (`fullscreenchange` + classe shell).
- **TabPanels mobile (iOS)** — `--ec-mobile-map-fixed-origin-top` (fixed repère shell hors plein écran) ; territoires sous la recherche ; minimap alignée sur le haut du mode.
- **TabPanels mobile** — `top` mesurés (croquis / minimap / territoires) via le DOM (`measureMobileFixedChromeTops`) ; origine fixed via sonde dans le shell (`detectMobileFixedUsesShellContainingBlock`) : vue adaptative Firefox / fenêtre étroite bureau = viewport ; Safari iOS = repère shell.
- **Recentrage carte** — padding `view.fit` : mesure la surface panneau (plus le shell pleine largeur) pour ne plus pousser la cerise à gauche.
- **Mode Parcelle** — recentrage sur l’emprise APICarto : cache vide non réutilisé, clé stable au changement de mode, vol avant refresh fiche.
- **TabPanels mobile** — onglets alignés à droite sans réserver la colonne zoom ; attributions / échelle : `--ec-tab-panels-inset` forcé à 0 en mobile ; passage bureau→mobile avec panneau ouvert → feuille snap aperçu 35 % ; pictos croisis mobile rétablis (`--ec-map-control-*`).
- **En-tête démo** — navigation mobile DSFR (bouton Menu + modale d’en-tête), alignée gpu-site ; initialisation du JS DSFR en mode Vue pour la démo Vite.
- **TabPanelsControl** — séparation contrôle OpenLayers (onglets seuls, `.ec-tab-panels__tabs-control`) et contenu panneau (`ec-tab-panels-shell` / `ec-tab-panels__surface`) : `ol.css` n’altère plus le DSFR dans la feuille ; variables CSS pour le futur bottom sheet mobile (snaps 0 / 35 / 70 / 98 %, safe areas, décalage en-tête site). Voir `src/lib/map/tabPanelsLayout.ts`.
- **MapModeSelector** — pictos Parcelle / Territoire : `ec-icon-parcelle` (`parcelle.svg`) et DSFR `fr-icon-france-fill` à la place de SVG inline ; format classique : boutons segmentés icône + libellé (sans « Mode » ni radios visibles), alignés sur `--ec-map-control-*`.
- **Onglet fiche info** — styles dans `fiche-info.css` (plus de neutralisation OpenLayers sur les boutons du panneau).
- **Onglet fiche info** — mode Parcelle : tags DSFR, modal références cadastrales, bouton territoire, onglets Infos/Documents avec bouton « Charger les informations », cartes document ; mode Territoire : retour parcelle, libellés d’onglets gpu-client, encart documents non exécutoires.
- **Recherche lieu (loupe)** — rejeu sur l’emprise **lieu** mémorisée (geopf), pas l’emprise rouge du mode ; le calcul de zoom exclut les polygones mode.
- **Sélecteur de mode carte** — cerise présente : vol animé sur l’emprise rouge APICarto (restauration permalink dès que la couche recherche est prête, ou après bascule Parcelle / Territoire) ; zoom max **19** en Parcelle (contour serré), **15** en Territoire ; pas de déplacement si emprise absente.
- **Emprise lieu après recherche** — conserver le contour geopf bleu pointillé avec l’emprise mode APICarto ; clé d’emprise stable (plus de resync `moveend` qui écrasait le mode).
- **Outils geopf mobile** — boutons minimap / territoires dans la barre basse : état actif bleu (plus blanc sur blanc).
- **TerritoriesControl (mobile)** — boutons slot alignés `--ec-map-control-*` ; panneaux `dialog` / `#gpf-territories-views-container-id` en fixed sous la recherche lieu (insets `--ec-widget-gap`) ; boutons panneau (fermer, « Modifier les territoires ») : neutralisation `ol.css` + rendu geopf/DSFR comme au bureau ; surcharges bureau (`left: 100%`) inchangées.
- **MapModeSelector** — écart recherche réduit (`--ec-map-mode-search-gap`) ; téléporté dans la couche contrôles OL (onglets au-dessus du mode, feuille mobile au-dessus) ; masqué quand Territoires geopf est actif.
- **Emprise mode après recherche lieu** — conserver l’emprise lieu geopf (`trueGeometry`, bleu pointillé) avec l’emprise mode APICarto ; clé stable ; mode lu au setup (recherche geopf en `requestAnimationFrame`).
- **Couche cadastre basse (fonds de plan)** — bascule PCI Express, BD Parcellaire (`CADASTRALPARCELS.PARCELS`) ou WMS INSPIRE PCI Vecteur selon `typeref` et INSEE renvoyés par `/api/fiche-info` (aligné gpu-client `CadastreLow`) ; attributions INSPIRE : logos Marianne + ministère (© DGFIP en `title`) ; logos IGN et ministère avec infobulles `title`.
- **Fonds Géoplateforme** — sources WMTS tuiles 512 px, matrices PM 5–19 (`ol/source/WMTS`, comme gpu-client `createWMTSSource`), à la place du pseudo-XYZ `{z}/{x}/{y}` ; ordre d’empilement OL aligné gpu-client (`cadastreLow` au-dessus des fonds, sous `limitRegional` / `limitDepartmental`).
- **Fiche info (sans sélection)** — consignes à puces statiques ; avec cerise, changement de mode met à jour la fiche (cache par point/mode, sans refetch si déjà chargé).
- **Emprise mode (Parcelle / Territoire)** — cache APICarto (parcelle, commune, geo.api) par point et par mode ; pas de nouvelle requête si la cerise n’a pas bougé.
- **Fiche info Territoire** — documents uniquement via `apiFicheInfoUrl` (gpu-client-config) ; plus de repli APICarto `gpu/document` ni d’appel `/api/fiche-info` par défaut ; message « Indisponibilité du service » si l’API n’est pas configurée.
- **Config GPU** — URL relatives (`*Url`) résolues depuis l’hôte du script `gpu-client-config.js` (puis proxy dev Vite si besoin).
- **Fiche info** — contenu parcelle / document construit à partir du JSON `/api/fiche-info` (gpu-site) : en-tête selon le mode, onglets DU / PSMV / SUP / SCoT et procédures en cours.
- **Fiche info gpu-site** — config Twig (`LAYER_CONFIG`) reconnue comme prête ; chargement fiche permalink (`mlon`/`mlat`) après montage TabPanels ; affichage low scale ; sync `gpu.config` avant planification cerise ; URL du script `gpu-client-config` déduite du DOM pour les `*Url` relatives ; `whenGpuClientConfigReady` passe en « prêt » dès `LAYER_CONFIG` / `apiFicheInfoUrl` (fiches bloquées en `idle`) ; bootstrap permalink si `mlon`/`mlat` dans le hash.
- **Permalink carte** — `lon`, `lat`, `mlon` et `mlat` sont écrits avec au plus 8 décimales dans le fragment d’URL.
- **Permalink carte** — sync des couches catalogue / données / fond de plan dans le hash ; `mode` dans `#…` (plus en query `?mode=`).
- **Permalink carte** — encodage percent des clés/valeurs couche ; normalisation des hash gpu-client legacy (avertissement Vue Router).
- **Couches permalink** — format gpu-client `v:w:x:y:z` (catalogue, opacité, pile, gris, visibilité panneau) ; lecture legacy 4 segments conservée.
- **SearchEngineControl** — les formulaires de recherche avancée (lieux, INSEE, coordonnées, parcelles) appliquent la même cerise bleue, le vol animé et l’ouverture fiche que l’autocomplete principal.
- **Emprise mode** — commune (Territoire) ou parcelle (Parcelle) APICarto en rouge pointillé au clic et après recherche lieu ; emprise geopf du lieu conservée pour le zoom recherche uniquement.
- **Emprise mode** — plus de seuil de zoom ; Territoire à Paris/Lyon/Marseille : arrondissement orange (APICarto) + commune ville rouge (geo.api.gouv.fr).
- **Catalogue couches** — plus de couches démo par défaut ; roue « En attente de la récupération des couches… » pendant le chargement `gpu-client-config` / `LAYER_CONFIG`.
- **Popup style croquis** — deux lignes d’actions : Annuler / Rétablir (tertiaire, mini-historique du style) puis Supprimer / Fermer ; les changements en direct restent aussi dans l’historique croquis.
- README restructuré (anglais de référence + aperçu `README.fr.md`).

## [0.3.0] - 2026-09-25

### Ajouté

- Bundles standalone : `entree-carto-search-engine`, `entree-carto-location-search`, `entree-carto-geometry-editor`, `entree-carto-sketch`.
- Démo bandeau d’accueil GPU, widgets SearchEngine / recherche localisation, SPA pilotée par `demo-config`.
- Panneau latéral, outils croquis, éditeur de géométries, intégration registre WMS.
- Vitest, ESLint, Prettier, pre-commit Husky, CI GitHub Actions et démo Pages.

### Modifié

- Stack Vue 3 + OpenLayers 10 + VueDSFR en remplacement du modèle d’intégration gpu-client pour les nouveaux déploiements.

[Non publié]: https://github.com/IGNF/gpu-entree-carto/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/IGNF/gpu-entree-carto/releases/tag/v0.3.0
