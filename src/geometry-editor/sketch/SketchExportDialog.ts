import type { SketchIoFormat } from './sketchIo'

/**
 * Boîte de dialogue d’export croquis (format + Annuler / Exporter).
 */
export class SketchExportDialog {
  private readonly root: HTMLElement
  private readonly select: HTMLSelectElement
  private resolve: ((format: SketchIoFormat | null) => void) | null = null
  private readonly onDocPointerDown = (evt: PointerEvent): void => {
    if (!this.root.contains(evt.target as Node)) {
      this.close(null)
    }
  }
  private readonly onKeyDown = (evt: KeyboardEvent): void => {
    if (evt.key === 'Escape') this.close(null)
  }

  constructor(private readonly host: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'ec-sketch-export-dialog'
    this.root.setAttribute('role', 'dialog')
    this.root.setAttribute('aria-label', 'Exporter le croquis')
    this.root.hidden = true
    this.root.innerHTML = `
      <p class="ec-sketch-export-dialog__title">Exporter le croquis</p>
      <label class="ec-sketch-export-dialog__field">
        <span>Format</span>
        <select class="ec-sketch-export-dialog__format fr-select">
          <option value="geojson">GeoJSON</option>
          <option value="kml">KML</option>
        </select>
      </label>
      <div class="ec-sketch-export-dialog__actions">
        <button type="button" class="fr-btn fr-btn--sm fr-btn--secondary ec-sketch-export-dialog__cancel">Annuler</button>
        <button type="button" class="fr-btn fr-btn--sm ec-sketch-export-dialog__ok">Exporter</button>
      </div>
    `
    this.select = this.root.querySelector('.ec-sketch-export-dialog__format')!
    this.root
      .querySelector('.ec-sketch-export-dialog__cancel')!
      .addEventListener('click', () => this.close(null))
    this.root
      .querySelector('.ec-sketch-export-dialog__ok')!
      .addEventListener('click', () => {
        const v = this.select.value === 'kml' ? 'kml' : 'geojson'
        this.close(v)
      })
    this.host.appendChild(this.root)
  }

  /** Ouvre la boîte ; résout avec le format choisi ou `null` si annulé. */
  open(defaultFormat: SketchIoFormat = 'geojson'): Promise<SketchIoFormat | null> {
    if (this.resolve) this.finish(null)
    return new Promise((resolve) => {
      this.resolve = resolve
      this.select.value = defaultFormat
      this.root.hidden = false
      document.addEventListener('pointerdown', this.onDocPointerDown, true)
      document.addEventListener('keydown', this.onKeyDown, true)
      queueMicrotask(() => this.select.focus())
    })
  }

  destroy(): void {
    this.finish(null)
    this.root.remove()
  }

  private close(format: SketchIoFormat | null): void {
    this.finish(format)
  }

  private finish(format: SketchIoFormat | null): void {
    this.root.hidden = true
    document.removeEventListener('pointerdown', this.onDocPointerDown, true)
    document.removeEventListener('keydown', this.onKeyDown, true)
    const r = this.resolve
    this.resolve = null
    r?.(format)
  }
}
