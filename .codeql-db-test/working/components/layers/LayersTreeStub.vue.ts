import type { LayerTreeNode } from '@/types/stubs'

defineProps<{
  nodes: LayerTreeNode[]
}>()

const emit = defineEmits<{
  toggle: [id: string, visible: boolean]
}>()

function onChange(id: string, event: Event) {
  const target = event.target as HTMLInputElement
  emit('toggle', id, target.checked)
}
