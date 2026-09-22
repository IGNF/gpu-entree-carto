import type { ModifySubToolsVisibility } from './geometryTypeUtils'
import { appendGeometryToolIcon } from './geometryToolIcons'

export type ModifySubToolId = 'modify-shape' | 'modify-translate' | 'modify-rotate' | 'modify-style'

const SUB_TOOLS: { id: ModifySubToolId; label: string; iconClass: string }[] = [
  {
    id: 'modify-shape',
    label: 'Modification de forme',
    iconClass: 'ec-geometry-editor__tool--modify-shape',
  },
  {
    id: 'modify-translate',
    label: 'Déplacement',
    iconClass: 'ec-geometry-editor__tool--modify-translate',
  },
  {
    id: 'modify-rotate',
    label: 'Rotation',
    iconClass: 'ec-geometry-editor__tool--modify-rotate',
  },
  {
    id: 'modify-style',
    label: 'Modifier le style',
    iconClass: 'ec-geometry-editor__tool--modify-style',
  },
]

const DEFAULT_VISIBILITY: ModifySubToolsVisibility = {
  shape: true,
  translate: true,
  rotate: true,
  style: true,
}

function visibilityKey(id: ModifySubToolId): keyof ModifySubToolsVisibility {
  switch (id) {
    case 'modify-shape':
      return 'shape'
    case 'modify-translate':
      return 'translate'
    case 'modify-rotate':
      return 'rotate'
    case 'modify-style':
      return 'style'
  }
}

/**
 * Barre forme / déplacement / rotation / style, juxtaposée au bouton « Modifier ».
 */
export class ModifySubToolsBar {
  private readonly root: HTMLElement
  private readonly layoutToolbar: HTMLElement
  private activeId: ModifySubToolId | null
  private open = false
  private scrollBound = false
  private wheelBound = false
  private readonly visibility: ModifySubToolsVisibility

  private readonly onToolbarScroll = (): void => {
    this.reposition()
  }

  private readonly onModifyWheel = (evt: WheelEvent): void => {
    if (!this.open) return
    const toolbar = this.layoutToolbar
    const sub = this.root
    const subCanScroll = sub.scrollHeight > sub.clientHeight + 1
    if (subCanScroll) {
      const atTop = sub.scrollTop <= 0
      const atBottom = sub.scrollTop + sub.clientHeight >= sub.scrollHeight - 1
      if ((evt.deltaY > 0 && !atBottom) || (evt.deltaY < 0 && !atTop)) {
        sub.scrollTop += evt.deltaY
        evt.preventDefault()
        evt.stopPropagation()
        return
      }
    }
    if (toolbar.scrollHeight <= toolbar.clientHeight) return
    toolbar.scrollTop += evt.deltaY
    this.reposition()
    evt.preventDefault()
    evt.stopPropagation()
  }

  constructor(
    host: HTMLElement,
    layoutToolbar: HTMLElement,
    private readonly onSelect: (id: ModifySubToolId, active: boolean) => void,
    private styleEnabled = true,
    visibility: ModifySubToolsVisibility = DEFAULT_VISIBILITY,
  ) {
    this.root = host
    this.layoutToolbar = layoutToolbar
    this.visibility = { ...DEFAULT_VISIBILITY, ...visibility }
    this.activeId = this.getDefaultSubToolId()
    this.root.hidden = true

    for (const tool of SUB_TOOLS) {
      if (!this.isSubToolVisible(tool.id)) continue
      this.root.appendChild(this.createSubToolButton(tool))
    }

    this.syncLayout()
  }

  private createSubToolButton(tool: (typeof SUB_TOOLS)[number]): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `ec-geometry-editor__tool ${tool.iconClass}`
    btn.dataset.subToolId = tool.id
    btn.setAttribute('aria-label', tool.label)
    btn.setAttribute('aria-pressed', 'false')
    appendGeometryToolIcon(btn, tool.iconClass)
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const already = this.activeId === tool.id
      if (already) {
        this.setActive(null)
        this.onSelect(tool.id, false)
      } else {
        this.setActive(tool.id)
        this.onSelect(tool.id, true)
      }
    })
    return btn
  }

  private isSubToolVisible(id: ModifySubToolId): boolean {
    if (id === 'modify-style') {
      return this.styleEnabled && this.visibility.style
    }
    return this.visibility[visibilityKey(id)]
  }

  isSubToolAvailable(id: ModifySubToolId): boolean {
    return this.isSubToolVisible(id)
  }

  getDefaultSubToolId(): ModifySubToolId {
    for (const tool of SUB_TOOLS) {
      if (this.isSubToolVisible(tool.id)) return tool.id
    }
    return 'modify-translate'
  }

  setStyleEnabled(enabled: boolean): void {
    if (enabled === this.styleEnabled) return
    this.styleEnabled = enabled
    const styleBtn = this.root.querySelector<HTMLButtonElement>(
      '.ec-geometry-editor__tool--modify-style',
    )
    if (!enabled) {
      if (this.activeId === 'modify-style') {
        this.setActive(null)
        this.onSelect('modify-style', false)
      }
      styleBtn?.remove()
    } else if (!styleBtn && this.visibility.style) {
      const tool = SUB_TOOLS.find((t) => t.id === 'modify-style')!
      this.root.appendChild(this.createSubToolButton(tool))
    }
    if (this.activeId && !this.isSubToolVisible(this.activeId)) {
      this.setActive(this.getDefaultSubToolId())
    }
    this.syncLayout()
  }

  setOpen(open: boolean): void {
    this.open = open
    this.root.hidden = !open
    if (open) {
      this.bindScroll()
      if (this.activeId) this.setActive(this.activeId)
      this.reposition()
    } else {
      this.unbindScroll()
      this.clearPosition()
    }
  }

  isOpen(): boolean {
    return this.open
  }

  setActive(id: ModifySubToolId | null): void {
    if (id !== null && !this.isSubToolVisible(id)) {
      id = this.getDefaultSubToolId()
    }
    this.activeId = id
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('button[data-sub-tool-id]')) {
      const on = id !== null && btn.dataset.subToolId === id
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.classList.toggle('is-active', on)
    }
  }

  getActive(): ModifySubToolId | null {
    return this.activeId
  }

  /** Sous-outil par défaut à l’ouverture du panneau « Modifier ». */
  resetToDefaultSubTool(): void {
    this.setActive(this.getDefaultSubToolId())
  }

  private bindScroll(): void {
    if (!this.scrollBound) {
      this.layoutToolbar.addEventListener('scroll', this.onToolbarScroll, { passive: true })
      this.scrollBound = true
    }
    if (!this.wheelBound) {
      this.root.addEventListener('wheel', this.onModifyWheel, { passive: false })
      this.wheelBound = true
    }
  }

  private unbindScroll(): void {
    if (this.scrollBound) {
      this.layoutToolbar.removeEventListener('scroll', this.onToolbarScroll)
      this.scrollBound = false
    }
    if (this.wheelBound) {
      this.root.removeEventListener('wheel', this.onModifyWheel)
      this.wheelBound = false
    }
  }

  /** Zone visible (scrollport) de la barre principale, en coordonnées cluster. */
  private toolbarVisibleSpanInCluster(clusterRect: DOMRect): { top: number; bottom: number } {
    const toolbarRect = this.layoutToolbar.getBoundingClientRect()
    return {
      top: toolbarRect.top - clusterRect.top,
      bottom: toolbarRect.bottom - clusterRect.top,
    }
  }

  private clearPosition(): void {
    this.root.style.top = ''
    this.root.style.left = ''
    this.root.style.right = ''
    this.root.style.bottom = ''
    this.root.style.maxHeight = ''
    this.root.style.maxWidth = ''
  }

  /** Aligne la barre sur le bouton « Modifier » (hors flux flex du cluster). */
  private reposition(): void {
    if (!this.open || this.root.hidden) return
    const modifyBtn = this.layoutToolbar.querySelector<HTMLButtonElement>(
      'button[data-tool-id="modify"]',
    )
    const cluster = this.root.parentElement
    if (!modifyBtn || !cluster) return

    const gap = parseGapPx(cluster)
    const clusterRect = cluster.getBoundingClientRect()
    const btnRect = modifyBtn.getBoundingClientRect()
    const corner = cluster.parentElement?.dataset.corner ?? ''
    const toolbarHorizontal = this.layoutToolbar.dataset.layout === 'horizontal'
    const mirror = corner === 'top-right' || corner === 'bottom-right'
    const visible = this.toolbarVisibleSpanInCluster(clusterRect)

    this.root.style.bottom = ''
    this.root.style.maxHeight = ''
    this.root.style.maxWidth = ''

    if (toolbarHorizontal) {
      let top = btnRect.bottom - clusterRect.top + gap
      const left = btnRect.left - clusterRect.left
      if (top < visible.top) top = visible.top
      const maxHeight = Math.max(0, visible.bottom - top)
      this.root.style.top = `${top}px`
      this.root.style.left = `${left}px`
      this.root.style.right = 'auto'
      this.root.style.maxHeight = `${maxHeight}px`
      return
    }

    let top = btnRect.top - clusterRect.top
    if (top < visible.top) top = visible.top
    const maxHeight = Math.max(0, visible.bottom - top)
    this.root.style.top = `${top}px`
    this.root.style.maxHeight = `${maxHeight}px`

    if (mirror) {
      this.root.style.left = 'auto'
      this.root.style.right = `${clusterRect.right - btnRect.left + gap}px`
    } else {
      this.root.style.right = 'auto'
      this.root.style.left = `${btnRect.right - clusterRect.left + gap}px`
    }
  }

  private syncLayout(): void {
    const toolbarHorizontal = this.layoutToolbar.dataset.layout === 'horizontal'
    this.root.dataset.orientation = toolbarHorizontal ? 'row' : 'column'
    this.root.classList.toggle('ec-geometry-editor__modify-toolbar--row', toolbarHorizontal)
    this.root.classList.toggle('ec-geometry-editor__modify-toolbar--column', !toolbarHorizontal)

    const cluster = this.root.parentElement
    cluster?.classList.toggle('ec-geometry-editor__toolbar-cluster--stack', toolbarHorizontal)
    this.reposition()
  }

  destroy(): void {
    this.unbindScroll()
    this.root.replaceChildren()
    this.clearPosition()
    this.root.hidden = true
    this.open = false
  }
}

function parseGapPx(el: HTMLElement): number {
  const raw = getComputedStyle(el).gap || getComputedStyle(el).columnGap
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 4
}
