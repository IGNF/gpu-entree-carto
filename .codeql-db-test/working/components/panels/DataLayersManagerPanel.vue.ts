/**
 * Onglet « Couches de données » — pile des couches choisies dans le catalogue.
 */
import { ref } from 'vue'
import type { ManagedLayer } from '@/composables/managedLayers'
import { tabPanelsApiRef } from '@/composables/tabPanels'
import '@/styles/data-layers.css'

const props = defineProps<{
  layers: ManagedLayer[]
  mapZoom: number
  catalogEntryInZoomRange: (id: string, zoom: number) => boolean
}>()

function layerInZoomRange(layer: ManagedLayer): boolean {
  return props.catalogEntryInZoomRange(layer.id, props.mapZoom)
}

const emit = defineEmits<{
  visible: [id: string, visible: boolean]
  opacity: [id: string, opacity: number]
  'toggle-grayscale': [id: string]
  remove: [id: string]
  reorder: [fromDisplayIndex: number, toInsertBefore: number]
  'enable-aggregate-detail': [aggregateId: string]
  'regroup-aggregate': [aggregateId: string]
}>()

const dragLayerId = ref<string | null>(null)
const dragInsertIndex = ref<number | null>(null)
let dropCommitted = false

function toggleVisible(layer: ManagedLayer) {
  emit('visible', layer.id, !layer.visible)
}

function openLegendsForLayer(layer: ManagedLayer) {
  tabPanelsApiRef.value?.openLegendForLayer(layer.id)
}

function onDragStart(event: DragEvent, index: number) {
  const layer = props.layers[index]
  if (!layer) return
  dropCommitted = false
  dragLayerId.value = layer.id
  dragInsertIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', layer.id)
    if (event.target instanceof HTMLElement) {
      event.dataTransfer.setDragImage(event.target, 12, 12)
    }
  }
}

function clearDragState() {
  dragLayerId.value = null
  dragInsertIndex.value = null
}

function onDragEnd() {
  window.setTimeout(() => {
    if (!dropCommitted) clearDragState()
    dropCommitted = false
  }, 0)
}

function insertIndexFromPointer(event: DragEvent, index: number, layerCount: number): number {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const mid = rect.top + rect.height / 2
  const before = event.clientY < mid ? index : index + 1
  return Math.min(Math.max(0, before), layerCount)
}

function onItemDragOver(event: DragEvent, index: number) {
  if (!dragLayerId.value) return
  event.preventDefault()
  event.stopPropagation()
  dragInsertIndex.value = insertIndexFromPointer(event, index, props.layers.length)
}

function onListDragOver(event: DragEvent) {
  if (!dragLayerId.value) return
  event.preventDefault()
}

function onTailDragOver(event: DragEvent) {
  if (!dragLayerId.value) return
  event.preventDefault()
  event.stopPropagation()
  dragInsertIndex.value = props.layers.length
}

function onDrop() {
  const fromIndex = props.layers.findIndex((l) => l.id === dragLayerId.value)
  const toInsertBefore = dragInsertIndex.value
  if (fromIndex >= 0 && toInsertBefore !== null) {
    emit('reorder', fromIndex, toInsertBefore)
    dropCommitted = true
  }
  clearDragState()
}

function dragFromIndex(): number | null {
  if (!dragLayerId.value) return null
  const i = props.layers.findIndex((l) => l.id === dragLayerId.value)
  return i >= 0 ? i : null
}

function showDropMarkerBefore(index: number): boolean {
  const from = dragFromIndex()
  return from !== null && dragInsertIndex.value === index
}
