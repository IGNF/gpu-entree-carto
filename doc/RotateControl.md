# RotateControl

Boussole : remet la carte face au nord, puis permet de revenir à l’orientation précédente (même fonction que la boussole `ol-rotate-north` de gpu-client).

**Source :** `src/components/map/RotateControl.vue`
**Orientation partagée :** `src/composables/useMapRotation.ts` (orientation en radians, `canRestore`, `toggleNorth()`)

## Comportement

- **Toujours visible.** L’aiguille (icône personnalisée `ec-icon-compass-north` : pointe nord verticale vers le haut, marquée « N ») suit l’orientation de la carte en tournant autour du milieu de l’aiguille (le SVG est centré sur l’aiguille, pas sur l’ensemble aiguille + N) ; bouton de taille standard.
- **Info-bulle** au survol ou au focus clavier, comme le zoom et le plein écran (styles Géoplateforme `.gpf-widget`, texte tiré de `aria-label`).
- **Clic sur carte tournée** : retour animé au nord (250 ms), l’orientation quittée est mémorisée ; le libellé devient « Revenir à l’orientation précédente ».
- **Clic sur carte au nord** : retour animé à l’orientation mémorisée, s’il y en a une (sinon, aucun effet). Une rotation manuelle entre-temps remplace la mémoire au clic suivant.
- La carte tourne avec **Alt + Maj + glisser** (ordinateur) ou la **rotation à deux doigts** (mobile), interactions OpenLayers par défaut.
- Animation de l’aiguille désactivée si « réduire les animations ».

## Placement

- **Ordinateur** : contrôle OpenLayers dans le coin geopf bas droite (`CONTROL_POSITIONS.rotate`), **au-dessus du zoom** (`order: -1`).
- **Mobile** : bouton équivalent en tête de la pile zoom / plein écran de [TabPanelsControl](./TabPanelsControl.md).

## Intégration

```vue
<MapShell>
  <RotateControl />
  <ZoomControl />
</MapShell>
```

Monté sur `/map`, la démo fiche info et la carte intégrée (`EmbedMapViewer`).

## Dépendances

- `ol/control/Control`, vue OpenLayers (`change:rotation`, `animate`).
- `placeElementInGeopfContainer` (`src/map/geopfControlPlacement.ts`).
