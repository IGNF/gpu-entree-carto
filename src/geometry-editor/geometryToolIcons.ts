/** Classe Remix Icon (`<i class="ri-…">`) pour chaque modificateur BEM toolbar. */
const REMIX_BY_TOOL_CLASS: Record<string, string> = {
  'ec-geometry-editor__tool--tools-toggle': 'ri-tools-fill',
  'ec-geometry-editor__tool--measure-distance': 'ri-ruler-line',
  'ec-geometry-editor__tool--measure-area': 'ri-custom-size',
  'ec-geometry-editor__tool--save': 'ri-save-line',
  'ec-geometry-editor__tool--undo': 'ri-corner-up-left-line',
  'ec-geometry-editor__tool--redo': 'ri-corner-up-right-line',
  'ec-geometry-editor__tool--point': 'ri-map-pin-5-line',
  'ec-geometry-editor__tool--line': 'ri-draw-line',
  'ec-geometry-editor__tool--polygon': 'ri-pentagon-line',
  'ec-geometry-editor__tool--rectangle': 'ri-rectangle-line',
  'ec-geometry-editor__tool--circle': 'ri-circle-line',
  'ec-geometry-editor__tool--disc': 'ri-circle-line',
  'ec-geometry-editor__tool--text': 'ri-text',
  'ec-geometry-editor__tool--modify': 'ri-edit-line',
  'ec-geometry-editor__tool--remove': 'ri-close-circle-line',
  'ec-geometry-editor__tool--clear-all': 'ri-delete-bin-6-fill',
  'ec-geometry-editor__tool--export': 'ri-upload-line',
  'ec-geometry-editor__tool--import': 'ri-download-line',
  'ec-geometry-editor__tool--settings': 'ri-settings-3-line',
}

export function remixIconClassForToolModifier(iconClass: string): string | null {
  return REMIX_BY_TOOL_CLASS[iconClass] ?? null
}

export function appendGeometryToolIcon(button: HTMLElement, iconClass: string): void {
  const remix = remixIconClassForToolModifier(iconClass)
  if (!remix) return
  const icon = document.createElement('i')
  icon.className = `${remix} ec-geometry-editor__tool-icon`
  icon.setAttribute('aria-hidden', 'true')
  button.appendChild(icon)
}

export function updateSaveToolBadge(badge: HTMLElement, state: 'idle' | 'saved' | 'dirty'): void {
  badge.hidden = state === 'idle'
  badge.dataset.state = state
  badge.replaceChildren()
  if (state === 'dirty') {
    const icon = document.createElement('i')
    icon.className = 'ri-alert-line'
    icon.setAttribute('aria-hidden', 'true')
    badge.appendChild(icon)
  } else if (state === 'saved') {
    const icon = document.createElement('i')
    icon.className = 'ri-checkbox-circle-fill'
    icon.setAttribute('aria-hidden', 'true')
    badge.appendChild(icon)
  }
}
