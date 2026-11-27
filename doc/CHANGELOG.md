# Journal des modifications

Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnement [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Impression de la carte (PDF / PNG / JPEG) avec annexes : fiches territoire et parcelle, légendes.
- Fiche info parcelle / territoire branchée sur l’API gpu-site `/api/fiche-info` ([FicheInfoApi](./FicheInfoApi.md)).
- Fiche info : bouton « Réessayer » en cas d’échec, message dédié en cas de saturation (HTTP 429).
- Sélecteur de mode Parcelle / Territoire et emprise du lieu en rouge pointillé.
- Permalink de la carte (position, cerise, mode, couches) compatible gpu-client.
- Panneau latéral mobile en bottom sheet.
- Démo autonome avec assets DSFR / Remix locaux ([DemoExternal](./DemoExternal.md)).
- Référence des icônes ([icone-references](./icone-references.md)).
- Démo « Fiche info » : carte, catalogue, recherche de lieu, sélecteur de mode, recherche par identifiant de parcelle (`34_301_000_000_AS_0136` ou `34301000000AS0136`) et onglet « Données brutes » (champs non utilisés grisés).
- Démo « Fiche info » : bouton pour activer / désactiver l’interrogation au clic.

### Modifié

- Fiche info et catalogue : onglets animés comme le composant onglet DSFR, glissement de la fiche au changement de mode Parcelle / Territoire.
- Carte : plus de recentrage automatique sur la parcelle ou la commune (changement de mode, permalien) ; les tags Parcelle / Territoire de la fiche recentrent la vue.
- Fiche info : une seule requête par point, familles (DU, SUP, SCoT) demandées selon le catalogue.
- Fiche info : contenu filtré selon les couches cochées, mis à jour sans nouvel appel.
- Fonds Géoplateforme en WMTS et couche cadastre selon la commune, comme gpu-client.
- Contrôles carte harmonisés (couleurs, mobile, plein écran).
- Documentation en français uniquement, regroupée dans `doc/`.
- Mises à jour des dépendances.
- Carte : zoom par niveaux entiers, comme gpu-client (moins de tuiles chargées).
- Fonds de plan nets : mêmes tuiles que cartes.gouv.fr à zoom égal (libellés à leur taille normale) ; impression inchangée.
- Carte : couches GPU en résolution standard sur écran haute densité (tuiles 4 fois plus légères) ; impression toujours nette.
- Carte : affichage plus rapide et plus fluide (plus de chargements en parallèle, limites administratives chargées seulement quand elles s’affichent).
- Carte : couches GPU affichées ensemble chargées en une seule requête (moins de requêtes et de données par tuile).

### Corrigé

- Accueil : pictogrammes DSFR du bandeau qui ne s’affichaient pas.
- Fiche parcelle : mise en compatibilité d’un SCoT affichée en double dans l’onglet Documents.
- Fiche info territoire : documents invisibles dans les onglets sur la version construite.
- Légendes : plus de clignotement à chaque changement de zoom ; légendes hors échelle nettement grisées (titre, libellés, pictos).
- Fiche parcelle : périmètres d’informations manquants avec le catalogue du Géoportail de l’urbanisme.
- Fiche parcelle : lien vers la pièce écrite (PDF) de chaque règle quand le service ne fournit que le nom du fichier, servitudes comprises ; pas d’icône sans pièce écrite.
- Démo en ligne : emprise de la commune affichée en mode Territoire.
- Fiche info : les tuiles mènent à la page du document, jamais à un téléchargement (pas de lien si le document n’est pas en base) ; liens SUP et MEC corrigés sur le Géoportail de l’urbanisme.
- Fiche territoire : titre « Pas de commune à cet emplacement » et message adapté hors commune (en mer).
- Fiche info : servitude de passage sur le littoral (EL9) affichée pour les communes littorales (territoire) et dans la zone d’alerte (parcelle), avec lien vers l’article L. 121-31 du code de l’urbanisme.
- Couches WMS : héritage des niveaux de zoom du groupe parent.
- Carte : plus de zonage absent entre les zooms 11 et 11,4 ; catalogue grisé selon l’affichage réel des couches.
- Fiche info : chargements en double ou bloqués au rechargement et après une recherche.
- Fiche info : documents et règles SUP / SCoT / MEC affichés à tort ou manquants.
- Permalink : état des couches du catalogue mal restauré.
- Impression : rendu, pagination des annexes, lenteur et blocages d’export.
- Recherche de lieu : erreur 400 sur saisie avec espaces.
- Contrôle Territoires : erreur à l’ouverture.
- Croquis : accrochage aux sommets existants.

### Sécurité

- Déploiement GitHub Pages limité aux `push` du dépôt.
- Suppression de l’`eval` de la recherche geopf, contrôle des bundles `dist/` en CI.
- Assainissement HTML renforcé (DOMPurify, liens `target`).

## [0.3.0] - 2026-09-25

### Ajouté

- Bundles autonomes : search-engine, location-search, geometry-editor, sketch.
- Démo accueil GPU et carte pilotée par `demo-config`.
- Panneau latéral, croquis, éditeur de géométries, registre WMS.
- Tests, lint, CI et démo GitHub Pages.

### Modifié

- Stack Vue 3 + OpenLayers 10 + VueDSFR en remplacement de gpu-client.

[Non publié]: https://github.com/IGNF/gpu-entree-carto/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/IGNF/gpu-entree-carto/releases/tag/v0.3.0
