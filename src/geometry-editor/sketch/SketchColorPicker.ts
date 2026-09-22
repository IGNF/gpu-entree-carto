/**
 * Sélecteur de couleur croquis : case → colorpicker natif ; hex #RRGGBBAA + opacité sous la case.
 */
import { parseColor, toHexRgb, toHexRgba, toRgbaString, type RgbaColor } from './colorUtils'

export type ColorChangeHandler = (rgba: string) => void

export class SketchColorPicker {
  readonly root: HTMLElement
  private readonly swatch: HTMLButtonElement
  private readonly hueInput: HTMLInputElement
  private readonly hexInput: HTMLInputElement
  private readonly alphaInput: HTMLInputElement
  private color: RgbaColor
  private onChange: ColorChangeHandler | null = null

  constructor(label: string, initial = 'rgba(0, 0, 145, 1)') {
    this.color = parseColor(initial)
    this.root = document.createElement('div')
    this.root.className = 'ec-sketch-color'
    this.root.innerHTML = `
      <span class="ec-sketch-color__label">${label}</span>
      <button type="button" class="ec-sketch-color__swatch" aria-label="${label}"></button>
      <input type="color" class="ec-sketch-color__hue-native" tabindex="-1" aria-hidden="true" />
      <label class="ec-sketch-color__hex-field">
        <span class="fr-sr-only">Code hexadécimal ${label}</span>
        <input type="text" class="ec-sketch-color__hex fr-input" maxlength="9" spellcheck="false" inputmode="text" autocomplete="off" />
      </label>
      <label class="ec-sketch-color__alpha-field">
        <span class="fr-sr-only">Opacité ${label}</span>
        <input type="range" min="0" max="100" step="1" class="ec-sketch-color__alpha" />
      </label>
    `
    this.swatch = this.root.querySelector('.ec-sketch-color__swatch')!
    this.hueInput = this.root.querySelector('.ec-sketch-color__hue-native')!
    this.hexInput = this.root.querySelector('.ec-sketch-color__hex')!
    this.alphaInput = this.root.querySelector('.ec-sketch-color__alpha')!

    this.swatch.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.openNativePicker()
    })

    this.hueInput.addEventListener('input', () => {
      const c = parseColor(this.hueInput.value)
      this.color = { ...c, a: this.color.a }
      this.syncUi({ syncHue: false })
      this.emit()
    })

    this.hexInput.addEventListener('input', () => {
      const raw = this.hexInput.value.trim()
      if (!this.isCompleteColorInput(raw)) return
      this.applyParsedColor(parseColor(raw, this.color), { updateHexField: false })
    })
    this.hexInput.addEventListener('change', () => this.commitHexField())
    this.hexInput.addEventListener('blur', () => this.commitHexField())

    this.alphaInput.addEventListener('input', () => {
      this.color = { ...this.color, a: Number(this.alphaInput.value) / 100 }
      this.syncHexFromColorUnlessEditing()
      this.paintSwatch()
      this.emit()
    })

    this.syncUi({ forceHex: true })
  }

  setOnChange(cb: ColorChangeHandler | null): void {
    this.onChange = cb
  }

  getValue(): string {
    return toRgbaString(this.color)
  }

  setValue(value: string): void {
    this.color = parseColor(value)
    this.syncUi({ forceHex: true })
  }

  close(): void {
    /* plus de panneau flottant */
  }

  destroy(): void {
    this.root.remove()
  }

  containsNode(node: Node | null): boolean {
    if (!node) return false
    return this.root.contains(node)
  }

  private emit(): void {
    this.onChange?.(this.getValue())
  }

  /** Valeur hex entièrement saisie (pas de reformat pendant la frappe). */
  private isCompleteColorInput(raw: string): boolean {
    if (!raw || raw === 'transparent') return raw === 'transparent'
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) return true
    return /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i.test(raw)
  }

  private commitHexField(): void {
    this.color = parseColor(this.hexInput.value, this.color)
    this.syncUi({ forceHex: true })
    this.emit()
  }

  private applyParsedColor(next: RgbaColor, opts: { updateHexField: boolean }): void {
    this.color = next
    this.hueInput.value = toHexRgb(this.color)
    this.alphaInput.value = String(Math.round(this.color.a * 100))
    if (opts.updateHexField) {
      this.hexInput.value = toHexRgba(this.color)
    }
    this.paintSwatch()
    this.emit()
  }

  private syncHexFromColorUnlessEditing(): void {
    if (document.activeElement === this.hexInput) return
    this.hexInput.value = toHexRgba(this.color)
  }

  private syncUi(opts: { syncHue?: boolean; forceHex?: boolean } = {}): void {
    const syncHue = opts.syncHue !== false
    if (syncHue) this.hueInput.value = toHexRgb(this.color)
    if (opts.forceHex || document.activeElement !== this.hexInput) {
      this.hexInput.value = toHexRgba(this.color)
    }
    this.alphaInput.value = String(Math.round(this.color.a * 100))
    this.paintSwatch()
  }

  private paintSwatch(): void {
    this.swatch.style.backgroundColor = toRgbaString(this.color)
    this.swatch.classList.toggle('is-transparent', this.color.a <= 0.001)
  }

  private openNativePicker(): void {
    try {
      if (typeof this.hueInput.showPicker === 'function') {
        this.hueInput.showPicker()
      } else {
        this.hueInput.click()
      }
    } catch {
      this.hueInput.click()
    }
  }
}
