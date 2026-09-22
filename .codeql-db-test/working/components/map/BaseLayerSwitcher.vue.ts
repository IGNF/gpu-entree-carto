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
