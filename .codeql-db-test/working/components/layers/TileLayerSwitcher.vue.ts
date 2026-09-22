/**
 * Sélecteur de fonds de plan en tuiles (équivalent TileLayerSwitcherControl gpu-client).
 */
import type { BaseLayerId, BaseLayerPreset } from '@/ol/baseLayers'
import { setActiveBaseLayer } from '@/ol/baseLayers'

const props = defineProps<{
  presets: BaseLayerPreset[]
  modelValue: BaseLayerId
}>()

const emit = defineEmits<{
  'update:modelValue': [id: BaseLayerId]
}>()

function select(id: BaseLayerId) {
  setActiveBaseLayer(props.presets, id)
  emit('update:modelValue', id)
}

function thumbClass(id: BaseLayerId): string {
  return `ec-tile-switcher__thumb ec-tile-switcher__thumb--${id}`
}
