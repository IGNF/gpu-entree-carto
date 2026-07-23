# FullScreenControl

Contrôle plein écran Géoplateforme (`GeoportalFullScreen`).

**Source :** `src/components/map/FullScreenControl.vue`  
**Référence placement :** [cartes.gouv.fr / explorer-les-cartes](https://cartes.gouv.fr/explorer-les-cartes/) — `fullscreenOptions: 'bottom-right'`  
**Dépendance :** `geopf-extensions-openlayers`

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `position` | `GeopfControlPosition` | `'bottom-right'` | Position geopf |

## Placement

Bas-droite, même colonne que `ZoomControl`.

## Dépendances

- Enfant de `MapShell`.
- CSS geopf DSFR chargé dans la démo / l’embed.
