# ScaleLineControl

Barre d’échelle métrique OpenLayers (`ol/control/ScaleLine`), stylée d’après la maquette Figma « Echelle ».

**Source :** `src/components/map/ScaleLineControl.vue`  
**Figma :** [Echelle `715:24047`](https://www.figma.com/design/ARSe9rthrHEp6UFJOh5rdn/GPU---UX-UI?node-id=715-24047) (bloc « W.D Bas »)

## Props

Aucune pour l’instant.

## Options OpenLayers utilisées

| Option | Valeur | Description |
|--------|--------|-------------|
| `units` | `'metric'` | Unités métriques (m / km) |
| `className` | `'ec-scale-line'` | Classe CSS custom (remplace `ol-scale-line`) |

## Apparence (maquette)

- Fond blanc semi-transparent (`rgba(255,255,255,0.85)`), padding 4 px
- Trait en U : bordures gauche / bas / droite noires
- Libellé centré, Marianne Bold 11 px (ex. « 500 m »)

## Placement

**Bas-droite** de la carte (`right` / `bottom`), comme dans Figma — pas à gauche.

## Dépendances

- Enfant de `MapShell` (injection `olMap`).
- Styles globaux dans le SFC (le DOM OL est hors scoped).
