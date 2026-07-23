# gpu-client ↔ composants IGNF

Inventaire des fonctionnalités de [gpu-client](https://gitlab.gpf-tech.ign.fr/gpu/gpu-client) et recherche d’équivalents dans l’écosystème cartes.gouv.fr.

## Conclusion importante

**[cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) ne contient aucun contrôle cartographique.**  
Ce sont des composants de **chrome UI** (header, footer, modales, éditeur SQL) basés sur VueDSFR.

Les équivalents carte se trouvent ailleurs :

| Dépôt | Rôle |
|-------|------|
| [geopf-extensions-openlayers](https://github.com/IGNF/geopf-extensions-openlayers) | **Widgets OpenLayers** Géoplateforme (source de vérité des contrôles) |
| [cartes.gouv.fr-entree-carto](https://github.com/IGNF/cartes.gouv.fr-entree-carto) | **Wrappers Vue** autour de geopf (`src/components/carte/control/*`) |
| [cartes.gouv.fr-vue-components](https://github.com/IGNF/cartes.gouv.fr-vue-components) | Chrome site uniquement (`CgfrHeader`, `CgfrFooter`, modales…) |

---

## Légende de la colonne « Équivalent »

| Symbole | Signification |
|---------|----------------|
| **Oui** | Équivalent direct utilisable |
| **Partiel** | Proche, mais API / UX / métier GPU différent |
| **Non** | À réécrire (métier GPU) |
| **Chrome** | Uniquement dans vue-components (hors carte) |

---

## Matrice par fonctionnalité

### Coque carte / contrôles de base

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto (Vue) |
|------------|------|----------------|------------------|--------------------------------|
| `Viewer` | Shell `ol.Map` (`#gpu-map`) | Non | Map OL + couches GeoPF | `Map.vue` / `Carto.vue` |
| `ol.control.Zoom` | Zoom +/- | Non | `GeoportalZoom` **Oui** | `Zoom.vue` **Oui** |
| `ol.control.ScaleLine` | Barre d’échelle | Non | — (OL natif) | `ScaleLine.vue` **Oui** |
| `ol.control.Attribution` | Crédits | Non | `GeoportalAttribution` **Oui** | `Attributions.vue` **Oui** |
| Rotate nord | Remettre le nord | Non | — | — **Non** |
| `FullScreenSwitcherControl` | Plein écran | Non | `GeoportalFullScreen` **Oui** | `FullScreen.vue` **Oui** |
| `BarControl` | Barre d’outils groupée | Non | `ControlList` **Partiel** | `ControlList.vue` **Partiel** |

### Fonds de plan / couches

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `TileLayerSwitcherControl` | 6 fonds (Plan, Ortho, Cadastre…) | Non | `LayerSwitcher` **Partiel** | `LayerSwitcher.vue` **Partiel** |
| `TreeLayerSwitcherControl` | Arbre couches métier GPU | Non | `LayerSwitcher` + `Catalog` **Partiel** | idem **Partiel** |
| Couches cadastre / régions / dép. | Couches admin | Non | `LayerWMTS/WMS` **Partiel** | couches Vue **Partiel** |
| `createGeoportalLayer` / WMTS | Helpers fonds IGN | Non | Sources GeoPF **Oui** | via geopf **Oui** |

### Légende

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `LegendItem` / `LegendImages` | Légendes dans l’arbre | Non | `Legends` **Oui** | `Legends.vue` **Oui** |
| `ParcelLegend` | Légende vue parcelle | Non | — **Non** | — **Non** |

### Localisation / géocodage

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `LocateControl` | Lieu / adresse / parcelle | Non | `SearchEngine` **Partiel** | `SearchEngine.vue` **Partiel** |
| `services.Geocode` | Autocomplete Gp + cadastre | Non | SearchEngine / géocode IGN **Oui** | via geopf **Oui** |
| `DistrictService` | Arrondissements INSEE | Non | — **Non** | — **Non** |
| `ReverseGeocode` (absent gpu) | Adresse au clic | Non | `ReverseGeocode` **Oui** | `ReverseGeocode.vue` **Oui** |

### Fiche info / clic carte

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `ClickInfoControl` | Mode clic → fiche | Non | `GetFeatureInfo` **Partiel** | `GetFeatureInfo.vue` **Partiel** |
| `FicheInfo*` (DU/SUP/SCOT/parcelle) | Fiche métier GPU | Non | — **Non** | — **Non** (métier GPU) |
| `GpuApiClient` | API Symfony GPU | Non | — **Non** | — **Non** |
| `MarkerControl` | Marqueur + coords | Non | markers util **Partiel** | **Partiel** |
| `TabsPanelsControl` | Onglets fiche / couches | Non | — **Non** | UI custom **Partiel** |
| `FeaturePopupControl` | Style feature croquis | Non | Drawing styles **Partiel** | `Drawing.vue` **Partiel** |

### Parcelle

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `ParcelViewer` | Page fiche parcelle | Non | — **Non** | — **Non** |
| `ParcelMap` | Carte dédiée parcelle | Non | — **Non** | — **Non** |
| `SetScaleControl` | Choix d’échelle | Non | — **Non** | ScaleLine seulement **Partiel** |

### Mesure / dessin / impression

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `MeasureControl` | Distance / surface | Non | `MeasureLength/Area` **Oui** | `Measure*.vue` **Oui** |
| `DrawBarControl` + draw/edit/select | Croquis | Non | `Drawing` **Oui** | `Drawing.vue` **Oui** |
| `Import/ExportGeoJsonControl` | Import/export croquis | Non | `LayerImport`, `ButtonExport` **Partiel** | `LayerImport.vue` **Partiel** |
| `PrintControl` | Capture html2canvas | Non | — **Non** | `PrintModal.vue` (jspdf) **Partiel** |
| `LinkControl` | Lien légende print | Non | — **Non** | — **Non** |
| `ToolsBarControl` | Barre outils verticale | Non | `ControlList` **Partiel** | **Partiel** |

### Permalink / partage / aide / layout

| gpu-client | Rôle | vue-components | geopf-extensions | cartes.gouv entree-carto |
|------------|------|----------------|------------------|--------------------------|
| `PermalinkControl` | Hash URL GPU | Non | — **Non** | `Share` / `ShareModal` **Partiel** |
| `MiniMapControl` | Mini-carte | Non | `GeoportalOverviewMap` **Oui** | `OverviewMap.vue` **Oui** |
| `HelpLayerControl` | Bulles d’aide | Non | — **Non** | — **Non** |

### Chrome site (hors carte)

| Besoin | vue-components |
|--------|----------------|
| En-tête / pied de page DSFR | `CgfrHeader`, `CgfrFooter` **Chrome** |
| Modales thème / cookies | `CgfrModal*` **Chrome** |
| Autres | `CgfrSqlEditor`, `CgfrFollow`, `CgfrSelectList` **Chrome** |

---

## Synthèse pour entree-carto

### Réutilisables (priorité geopf + wrappers Vue IGNF)

- Zoom, plein écran, attributions, overview
- Légendes génériques
- Search / géocode Géoplateforme
- Drawing, mesures
- LayerSwitcher / Catalog (à adapter au modèle couches GPU)

### À conserver / réécrire (métier GPU, pas dans IGNF)

- Fiche info DU / SUP / SCOT / parcelle (`FicheInfo*`, `GpuApiClient`)
- `ParcelViewer` / légende parcelle
- Arbre de couches + légendes scale-dépendantes GPU
- Permalien URL spécifique gpu-site
- Aide cartographique, print métier, `DistrictService`
- Switcher de fonds « 6 tuiles » GPU (proche mais pas 1:1)

### vue-components

Utile uniquement si on aligne le **chrome** (header/footer) — **pas** pour la carte.

---

## Inventaire condensé gpu-client (exporté)

| Export | Type |
|--------|------|
| `gpu.createStandardViewer` | Assemblage carte complète |
| `gpu.Viewer` | Shell OL |
| `gpu.ParcelViewer` | Vue parcelle |
| `gpu.config` | Config hôte |
| `gpu.control.*` | ~24 contrôles (voir matrice) |
| `gpu.services.Geocode`, `FeaturesShower`, `HighlightFeature`, `DrawStyle`, `DistrictService` | Services |
| `gpu.helper.createWMTSSource`, `createGeoportalLayer`, `stringHelper` | Helpers |

Référence code : `/home/AHorde/SITES/gpu-client/src/gpu/`.

---

## Suite recommandée

1. Brancher **geopf-extensions-openlayers** pour les contrôles génériques (zoom, measure, draw, search…).
2. S’inspirer des wrappers Vue de **cartes.gouv.fr-entree-carto** pour le pattern `MapShell` + contrôles.
3. Porter le **métier GPU** (fiche, parcelle, arbre couches) depuis gpu-client — pas d’équivalent IGNF.
4. Ne pas attendre de composants carte de **vue-components**.
