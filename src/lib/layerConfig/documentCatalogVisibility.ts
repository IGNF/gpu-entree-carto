import type { StandardViewerDocument } from '@/lib/types'
import type { TreeLayerNode } from '@/types/treeLayerNode'
import { catalogChildNodes } from '@/lib/layerConfig/catalogLayerTargets'

export type DocumentCatalogBranch = 'du-overview' | 'du-detail' | 'sup' | 'scot'

function normalizeCatalogTitle(title: string): string {
  return title.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Branches catalogue à activer (gpu-client `switchToLayerDefinedByDocumentType`). */
export function documentCatalogBranchesForDocument(
  document: StandardViewerDocument | null | undefined,
): Set<DocumentCatalogBranch> | null {
  if (!document?.type?.trim()) return null
  const typeLower = document.type.trim().toLowerCase()
  const nameLower = (document.name ?? '').trim().toLowerCase()
  const branches = new Set<DocumentCatalogBranch>()

  if (typeLower === 'sup') {
    branches.add('sup')
    return branches
  }

  if (typeLower === 'scot') {
    branches.add('scot')
    return branches
  }

  if (['plu', 'pos', 'cc', 'plui', 'psmv', 'du'].includes(typeLower)) {
    branches.add('du-overview')
    branches.add('du-detail')
    return branches
  }

  if (typeLower === 'mec') {
    if (/^mec_.+_scot_/i.test(nameLower) || nameLower.includes('_scot')) {
      branches.add('scot')
    }
    if (/^mec_.+_du_/i.test(nameLower) || nameLower.includes('_du')) {
      branches.add('du-overview')
      branches.add('du-detail')
    }
    return branches.size ? branches : null
  }

  return null
}

export function catalogBranchForRootNode(node: TreeLayerNode): DocumentCatalogBranch | null {
  const title = normalizeCatalogTitle(node.title)
  const id = node.id.toLowerCase()

  if (
    title.includes("vue d'ensemble") ||
    (title.includes('vue') && title.includes('ensemble') && title.includes('urbanisme'))
  ) {
    return 'du-overview'
  }
  if (
    title.includes('vue detail') ||
    (title.includes('vue') && title.includes('detail') && title.includes('urbanisme'))
  ) {
    return 'du-detail'
  }
  if (title.includes('servitude') && title.includes('utilite publique')) {
    return 'sup'
  }
  if (title.includes('schema') && title.includes('coherence territoriale')) {
    return 'scot'
  }

  if (id.includes('lowscale')) return 'du-overview'
  if (id.includes('du-psmv')) return 'du-detail'
  if (id === 'sup' || id.endsWith('--sup') || /--sup--/.test(id)) return 'sup'
  if (id.includes('scot')) return 'scot'

  return null
}

/** Branche DU/SUP/SCOT portée par une racine catalogue (titre ou id, ou enfant direct). */
export function branchForCatalogSubtree(root: TreeLayerNode): DocumentCatalogBranch | null {
  const self = catalogBranchForRootNode(root)
  if (self) return self
  for (const child of catalogChildNodes(root)) {
    const branch = catalogBranchForRootNode(child)
    if (branch) return branch
  }
  return null
}

function setSubtreeVisible(node: TreeLayerNode, visible: boolean): void {
  node.visible = visible
  for (const child of catalogChildNodes(node)) {
    setSubtreeVisible(child, visible)
  }
}

/**
 * Coche uniquement les racines catalogue correspondant au type de document (démo / embed).
 * Les autres racines reconnues sont décochées ; les racines non mappées sont décochées aussi.
 */
export function applyDocumentCatalogVisibility(
  roots: TreeLayerNode[],
  document: StandardViewerDocument | null | undefined,
): void {
  const enabled = documentCatalogBranchesForDocument(document)
  if (!enabled?.size) return

  for (const root of roots) {
    const branch = branchForCatalogSubtree(root)
    if (!branch) {
      setSubtreeVisible(root, false)
      continue
    }
    setSubtreeVisible(root, enabled.has(branch))
  }
}
