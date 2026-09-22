/**
 * Fonds de cartes — liste verticale type gpu-site (panneau Catalogue).
 */
import { reactive } from 'vue'
import type { GpuBaseLayerId, GpuBaseLayerPreset } from '@/ol/gpuBaseLayerPresets'
import { filterThumbnailLayersAtPreviewZoom, wmtsPreviewTileUrl } from '@/ol/gpuBaseLayerThumbnails'
import SanitizedHtml from '@/components/common/SanitizedHtml.vue'
import '@/styles/base-layer-radio-list.css'

function previewLayers(preset: GpuBaseLayerPreset) {
  return filterThumbnailLayersAtPreviewZoom(preset.thumbnailLayers)
}

defineProps<{
  presets: GpuBaseLayerPreset[]
  modelValue: GpuBaseLayerId
}>()

const emit = defineEmits<{
  'update:modelValue': [id: GpuBaseLayerId]
}>()

const openDescriptions = reactive<Record<string, boolean>>({})

function isDescriptionOpen(id: GpuBaseLayerId): boolean {
  return openDescriptions[id] === true
}

function toggleDescription(id: GpuBaseLayerId) {
  openDescriptions[id] = !openDescriptions[id]
}

function select(id: GpuBaseLayerId) {
  emit('update:modelValue', id)
}
