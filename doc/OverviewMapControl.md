# OverviewMapControl

Mini-carte Géoplateforme (`GeoportalOverviewMap`).

**Source :** `src/components/map/OverviewMapControl.vue`  
**Référence :** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `overviewMapOptions: 'bottom-left'`  
**Dépendance :** `geopf-extensions-openlayers`

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `position` | `GeopfControlPosition` | `'bottom-left'` | Position geopf |
| `collapsed` | `boolean` | `true` | Mini-carte repliée au chargement |

## Placement

Bas-gauche, **au-dessus** du sélecteur de territoire (`order: -1` dans `map-controls.css`).

## Styles

- État actif / infobulle : mêmes règles que Territories (`map-controls.css`, alignement appendice sur le bord du bouton).

## Dépendances

- Enfant de `MapShell`
- CSS geopf DSFR + icônes DSFR (`utility/icons`)
