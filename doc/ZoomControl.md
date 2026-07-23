# ZoomControl

Contrôle de zoom OpenLayers (`ol/control/Zoom`), branché sur la carte via l’injection `olMap` de `MapShell`.

**Source :** `src/components/map/ZoomControl.vue`

## Props

Aucune pour l’instant.

## Options OpenLayers utilisées

| Option | Valeur | Description |
|--------|--------|-------------|
| `zoomInLabel` | `+` | Libellé bouton zoom avant |
| `zoomOutLabel` | `−` | Libellé bouton zoom arrière |
| `zoomInTipLabel` | `Zoom avant` | Infobulle |
| `zoomOutTipLabel` | `Zoom arrière` | Infobulle |

## Placement

Position par défaut OpenLayers (haut-gauche). À aligner plus tard sur la maquette Figma (bas-droite, bloc « Zoom »).

## Dépendances

- Doit être enfant (direct ou indirect) de `MapShell`.
- Cycle de vie : ajout à `map` au montage, retrait au démontage.
