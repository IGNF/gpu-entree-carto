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

Bas-droite, au-dessus du zoom (geopf `prepend` en `bottom-*`).  
Offset geopf `bottom: 0.5em` annulé en colonne bas-droite (`map-controls.css`) pour l’aligner avec l’échelle.

## Dépendances

- Enfant de `MapShell`.
- CSS geopf DSFR chargé dans la démo / l’embed.

## Comportement / CSS

- Picto via `::after` (mask geopf), pas de sprite Classic ni label OpenLayers.
- `map-controls.css` force `background-image: none` et masque le `<span>` interne pour éviter un doublon sous un hôte qui charge aussi le DSFR complet (gpu-site).
