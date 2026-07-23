# Démonstration (Vite)

Pages de démo locale (`npm run dev`) pour valider les contrôles et le parcours accueil → carte.

## Routes

| Route | Vue | Rôle |
|-------|-----|------|
| `/` | `HomeView.vue` | Accueil type gpu-site : `mountSearchEngine` → `/map?…` |
| `/map` | `DemoView.vue` | Carte + panneaux ; centrage si query `municipality` / `position_*` / `type` |

## Navigation

`DemoHeader.vue` (DSFR) : liens **Accueil** et **Carte**, comme le menu principal gpu-site (sous-ensemble).

## Flux localisation

1. Recherche validée sur `/` (`mountSearchEngine` en mode `emit`)
2. Navigation SPA vers `/map` avec query
3. `SearchEngineControl` + `initialSearch` rejoue le géocode geopf (cerise, emprise, popup)
