<script setup lang="ts">
/**
 * Croquis carte principale — contrôle OpenLayers SketchControl.
 * Placement : bottom-left, au-dessus de la minimap (order: -2).
 * toolsToggle activé ; localStorage + clearAll par défaut.
 */
import { useOlControl } from '@/composables/useOlControl'
import { CONTROL_POSITIONS, type GeopfControlPosition } from '@/map/controlPositions'
import {
  SketchControl,
  type SketchExtraTool,
} from '@/geometry-editor/SketchControl'
import type { GeometryTypeOption } from '@/geometry-editor/types'
import type { StyleLike } from 'ol/style/Style'
import '@/geometry-editor/styles/geometry-editor.css'

const props = withDefaults(
  defineProps<{
    position?: GeopfControlPosition
    geometryType?: GeometryTypeOption
    /** Coin du bouton menu ; défaut = position. */
    toolsToggle?: GeopfControlPosition | null
    localStorageKey?: string | null
    clearAll?: boolean
    zIndex?: number
    style?: StyleLike | null
    extraTools?: SketchExtraTool[]
  }>(),
  {
    position: CONTROL_POSITIONS.overviewMap,
    geometryType: 'Geometry',
    toolsToggle: undefined,
    localStorageKey: 'entree-carto-sketch',
    clearAll: true,
    zIndex: 500,
    style: null,
    extraTools: () => [],
  },
)

useOlControl(
  () =>
    new SketchControl({
      geometryType: props.geometryType,
      toolsToggle: props.toolsToggle === undefined ? props.position : props.toolsToggle,
      position: props.position,
      localStorageKey: props.localStorageKey,
      clearAll: props.clearAll,
      zIndex: props.zIndex,
      style: props.style,
      extraTools: props.extraTools,
    }),
)
</script>

<template>
  <span class="ec-ol-control-host" hidden aria-hidden="true" />
</template>
