# TerritoriesControl

Sélecteur de territoire Géoplateforme (`Territories`) — France métropolitaine, DOM-TOM, etc.

**Source :** `src/components/map/TerritoriesControl.vue`  
**Référence :** [cartes.gouv.fr](https://cartes.gouv.fr/explorer-les-cartes/) — `territoriesOptions` (`bottom-left`, `view.active`)  
**Dépendance :** `geopf-extensions-openlayers`

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `position` | `GeopfControlPosition` | `'bottom-left'` | Position geopf |
| `collapsed` | `boolean` | `true` | Panneau replié au chargement |
| `auto` | `boolean` | `true` | Charge la liste par défaut des territoires |
| `viewActive` | `boolean` | `true` | Affiche « Modifier les territoires » |

## Options geopf passées

- `panel: true`, `title: 'Sélectionner un territoire'`
- `view: { active, title: 'Modifier les territoires', description: 'Modifier la vue' }`
- Patch DOM après création :
  - titre header (geopf hardcode encore « Sélecteur de territoires ») ;
  - bouton fermer `#GPterritoriesPanelClose` + `gpf-btn-icon-close`, collé à droite du header.

## Placement

Bas-gauche, **sous** la minimap.

## Styles

- État actif du bouton : fond bleu (`map-controls.css`), pas la barre `::after` geopf
- Infobulle : appendice aligné sur le bord du bouton
- Titres longs dans `.gpf-tile` : police réduite + clamp 3 lignes
- Bouton fermer `#GPterritoriesPanelClose` : `position: absolute; right` dans le header
- Dialog `#gpf-territories-views-container-id` : collé à droite du panneau Territories (`left: 100%`), bas alignés (`bottom: 0`)
- Panneau Territories bas-gauche : `bottom: 0`, `max-height: 100cqb` (reste dans `.ec-map-shell`), liste de tuiles scrollable
- Widget en containing block (évite le `top: 0` geopf sur toute la hauteur de la carte)

## Dépendances

- Enfant de `MapShell`
- CSS icônes DSFR (`utility/icons/icons.min.css`) pour les pictos `fr-icon-*`
- Réseau pour vignettes / icônes territoires (URLs Géoplateforme)
