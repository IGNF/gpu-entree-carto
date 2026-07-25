/**
 * Sélecteur de couleur croquis : clic sur la case → dialogue (teinte native + hex + opacité).
 */
import {
  parseColor,
  toHexRgb,
  toRgbaString,
  type RgbaColor,
} from './colorUtils'

export type ColorChangeHandler = (rgba: string) => void

export class SketchColorPicker {
  readonly root: HTMLElement
  private readonly swatch: HTMLButtonElement
  private readonly panel: HTMLElement
  private readonly hexInput: HTMLInputElement
  private readonly hueInput: HTMLInputElement
  private readonly alphaInput: HTMLInputElement
  private readonly alphaValue: HTMLOutputElement
  private color: RgbaColor
  private open = false
  private onChange: ColorChangeHandler | null = null

  private readonly onDocDown = (evt: PointerEvent): void => {
    if (!this.open) return
    const t = evt.target as Node
    if (this.root.contains(t) || this.panel.contains(t)) return
    this.closePanel()
  }

  constructor(label: string, initial = 'rgba(0, 0, 145, 1)') {
    this.color = parseColor(initial)
    this.root = document.createElement('div')
    this.root.className = 'ec-sketch-color'
    this.root.innerHTML = `
      <span class="ec-sketch-color__label">${label}</span>
      <button type="button" class="ec-sketch-color__swatch" aria-label="${label}" aria-haspopup="dialog" aria-expanded="false"></button>
    `
    this.swatch = this.root.querySelector('.ec-sketch-color__swatch')!
    this.swatch.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this.open) this.closePanel()
      else this.openPanel()
    })

    this.panel = document.createElement('div')
    this.panel.className = 'ec-sketch-color__panel'
    this.panel.hidden = true
    this.panel.setAttribute('role', 'dialog')
    this.panel.setAttribute('aria-label', label)
    this.panel.innerHTML = `
      <p class="ec-sketch-color__panel-title">${label}</p>
      <label class="ec-sketch-color__hue-field">
        <span>Couleur</span>
        <input type="color" class="ec-sketch-color__hue" />
      </label>
      <label class="ec-sketch-color__hex-field">
        <span>Hexadécimal</span>
        <input type="text" class="ec-sketch-color__hex fr-input" maxlength="9" spellcheck="false" />
      </label>
      <label class="ec-sketch-color__alpha-field">
        <span>Opacité (<output class="ec-sketch-color__alpha-value">100</output>%)</span>
        <input type="range" min="0" max="100" step="1" class="ec-sketch-color__alpha" />
      </label>
    `
    this.hueInput = this.panel.querySelector('.ec-sketch-color__hue')!
    this.hexInput = this.panel.querySelector('.ec-sketch-color__hex')!
    this.alphaInput = this.panel.querySelector('.ec-sketch-color__alpha')!
    this.alphaValue = this.panel.querySelector('.ec-sketch-color__alpha-value')!

    this.hueInput.addEventListener('input', () => {
      const c = parseColor(this.hueInput.value)
      this.color = { ...c, a: this.color.a }
      this.syncUi(false)
      this.emit()
    })
    this.hexInput.addEventListener('input', () => {
      const next = parseColor(this.hexInput.value, this.color)
      // Ne valider que si parse plausible (hex / rgba)
      const raw = this.hexInput.value.trim()
      if (
        raw === 'transparent' ||
        /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw) ||
        /^rgba?\(/i.test(raw)
      ) {
        this.color = next
        this.syncUi(true)
        this.emit()
      }
    })
    this.hexInput.addEventListener('change', () => {
      this.color = parseColor(this.hexInput.value, this.color)
      this.syncUi(true)
      this.emit()
    })
    this.alphaInput.addEventListener('input', () => {
      this.color = { ...this.color, a: Number(this.alphaInput.value) / 100 }
      this.alphaValue.textContent = this.alphaInput.value
      this.paintSwatch()
      this.emit()
    })

    document.body.appendChild(this.panel)
    this.syncUi(true)
  }

  setOnChange(cb: ColorChangeHandler | null): void {
    this.onChange = cb
  }

  getValue(): string {
    return toRgbaString(this.color)
  }

  setValue(value: string): void {
    this.color = parseColor(value)
    this.syncUi(true)
  }

  close(): void {
    this.closePanel()
  }

  destroy(): void {
    this.closePanel()
    this.panel.remove()
    this.root.remove()
  }

  /** Inclure le panneau dans les tests « clic intérieur ». */
  containsNode(node: Node | null): boolean {
    if (!node) return false
    return this.root.contains(node) || this.panel.contains(node)
  }

  private emit(): void {
    this.onChange?.(this.getValue())
  }

  private syncUi(syncHue: boolean): void {
    if (syncHue) this.hueInput.value = toHexRgb(this.color)
    this.hexInput.value = toHexRgb(this.color)
    const pct = Math.round(this.color.a * 100)
    this.alphaInput.value = String(pct)
    this.alphaValue.textContent = String(pct)
    this.paintSwatch()
  }

  private paintSwatch(): void {
    this.swatch.style.backgroundColor = toRgbaString(this.color)
    this.swatch.classList.toggle('is-transparent', this.color.a <= 0.001)
  }

  private openPanel(): void {
    this.open = true
    this.swatch.setAttribute('aria-expanded', 'true')
    this.panel.hidden = false
    const rect = this.swatch.getBoundingClientRect()
    this.panel.style.position = 'fixed'
    this.panel.style.zIndex = '10050'
    let left = rect.left
    let top = rect.bottom + 4
    this.panel.style.left = `${left}px`
    this.panel.style.top = `${top}px`
    requestAnimationFrame(() => {
      const pr = this.panel.getBoundingClientRect()
      if (pr.right > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - pr.width - 8)
      }
      if (pr.bottom > window.innerHeight - 8) {
        top = Math.max(8, rect.top - pr.height - 4)
      }
      this.panel.style.left = `${left}px`
      this.panel.style.top = `${top}px`
      // Ouvre directement le sélecteur natif de couleur
      try {
        if (typeof this.hueInput.showPicker === 'function') {
          this.hueInput.showPicker()
        } else {
          this.hueInput.focus()
          this.hueInput.click()
        }
      } catch {
        this.hueInput.focus()
      }
    })
    document.addEventListener('pointerdown', this.onDocDown, true)
  }

  private closePanel(): void {
    this.open = false
    this.swatch.setAttribute('aria-expanded', 'false')
    this.panel.hidden = true
    document.removeEventListener('pointerdown', this.onDocDown, true)
  }
}
