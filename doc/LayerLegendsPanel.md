[![en](https://img.shields.io/badge/lang-en-red.svg)](LayerLegendsPanel.md)
[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](LayerLegendsPanel.fr.md)

# LayerLegendsPanel

Side panel **Legends** tab: symbols for layers **visible** in the “Data layers” stack.

**Source:** `src/components/panels/LayerLegendsPanel.vue`  
**Used in:** [TabPanelsControl](./TabPanelsControl.md) (tab 3)

## Props

| Prop     | Type             | Description                                                                                                                                |
| -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `layers` | `ManagedLayer[]` | **Data layers** stack (`visible` + legend) + **`onlyLegend`** layers active on map (`legendLayers` in `useManagedLayers`)                  |

## Behaviour

- Title with Remix icon `ri-list-indefinite` (aligned with tab button).
- **One DSFR `fr-accordion` section per layer**, grouped in `fr-accordions-group` ([DSFR accordion demo](https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/accordeon/demonstration-de-l-accordeon)): styles `@gouvfr/dsfr/dist/component/accordion/accordion.min.css` + `fr-accordion__btn` button (native chevron). Limited overrides in `layer-legends.css` to neutralise `.ol-control button` (OpenLayers).
- **By default**: all sections collapsed (titles only).
- **Legends** button in [DataLayersManagerPanel](./DataLayersManagerPanel.md) → `openLegendForLayer(id)`: opens tab, **expands** layer and **scrolls** to place its title at top of panel.
- Expanded content: list of `LegendItem` entries (`title`, one or more **pct / lin / surf** images on same line, gpu-client order).
- **`onlyLegend: true`**: absent from catalogue selector; row in **Data layers** if active; legend here (no duplicate if already in stack).
- **Deduplication**: entry already shown (same label + same symbols) not repeated; second accordion with same **title** and **legend** hidden (`dedupeLegendLayersForPanel`).
- **Out of zoom range** LAYER_CONFIG: greyed accordion (`ec-not-in-zoom-range`, same rule as catalogue).
- No opacity control here (reserved for [DataLayersManagerPanel](./DataLayersManagerPanel.md)).
- Image URLs: **`legendImageDetailDirectory`** (injected in `gpu.config` by `gpu-client-config.js`, also merged in `@/lib/config`) + relative image path + `.png`, as gpu-client `LegendImages#getUrl`.
- Symbols from `LEGEND_CONFIG` / `LEGEND_REFERENCES` (`gpuLegendItems.ts`, aligned gpu-client `CreateTreeLayerSwitcherItems`): filtered paths `info_surf/05`, sub-filters `hasfilter2`, “other” blocks, etc.
- **`scaleDependant`**: `-lowscale` / `-highscale` suffix recalculated from map **current zoom** (listen `change:resolution` on OL view).

## Dependencies

- Types: `@/types/stubs` (`LegendItem`), `@/composables/managedLayers`
- Config: `legendImageDetailDirectory` in `gpu.config` after GPU script load
