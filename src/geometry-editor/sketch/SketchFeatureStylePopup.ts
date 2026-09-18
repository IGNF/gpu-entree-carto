/**
 * Popup d’édition de style à la création (et reclic / icône modify).
 * Positionnée via Overlay OL (`bottom-center`), comme les popups mesure.
 */
import Overlay from 'ol/Overlay'
import { unByKey } from 'ol/Observable'
import type Map from 'ol/Map'
import type { Feature as OlFeature } from 'ol'
import type { Geometry as OlGeometry } from 'ol/geom'
import {
  applyFeatureStyle,
  defaultFeatureStyleAttrs,
  featureStyleKindOf,
  featureStylePopupAnchor,
  getFeatureStyleAttrs,
  type FeatureStyleAttrs,
  type FeatureStyleKind,
  type PointShape,
  type StrokeLineCap,
  type StrokeLineJoin,
} from './featureStyle'
import { SketchColorPicker } from './SketchColorPicker'

type BasicField =
  | 'text'
  | 'fontSize'
  | 'fontColor'
  | 'textStrokeColor'
  | 'rotation'
  | 'strokeColor'
  | 'strokeWidth'
  | 'fillColor'
  | 'radius'

type AdvancedField =
  | 'lineDash'
  | 'lineCap'
  | 'lineJoin'
  | 'lineDashOffset'
  | 'miterLimit'
  | 'fontFamily'
  | 'fontBold'
  | 'fontItalic'
  | 'textStrokeWidth'
  | 'pointShape'
  | 'pointRotation'
  | 'zIndex'

const BASIC_BY_KIND: Record<FeatureStyleKind, BasicField[]> = {
  text: ['text', 'fontSize', 'fontColor', 'textStrokeColor', 'rotation'],
  point: ['radius', 'fillColor', 'strokeColor', 'strokeWidth'],
  line: ['strokeColor', 'strokeWidth'],
  polygon: ['fillColor', 'strokeColor', 'strokeWidth'],
  circle: ['strokeColor', 'strokeWidth'],
  disc: ['fillColor', 'strokeColor', 'strokeWidth'],
}

const ADVANCED_BY_KIND: Record<FeatureStyleKind, AdvancedField[]> = {
  text: ['fontFamily', 'fontBold', 'fontItalic', 'textStrokeWidth', 'zIndex'],
  point: ['pointShape', 'pointRotation', 'zIndex'],
  line: ['lineDash', 'lineCap', 'lineJoin', 'lineDashOffset', 'miterLimit', 'zIndex'],
  polygon: ['lineDash', 'lineCap', 'lineJoin', 'lineDashOffset', 'miterLimit', 'zIndex'],
  circle: ['lineDash', 'lineCap', 'lineJoin', 'lineDashOffset', 'miterLimit', 'zIndex'],
  disc: ['lineDash', 'lineCap', 'lineJoin', 'lineDashOffset', 'miterLimit', 'zIndex'],
}

/**
 * Popup style croquis (création / édition).
 */
export class SketchFeatureStylePopup {
  private readonly root: HTMLElement
  private readonly overlay: Overlay
  private readonly basicFields: HTMLElement
  private readonly advancedFields: HTMLElement
  private readonly advancedToggle: HTMLButtonElement
  private readonly colorPickers: {
    fontColor: SketchColorPicker
    textStrokeColor: SketchColorPicker
    fillColor: SketchColorPicker
    strokeColor: SketchColorPicker
  }
  private readonly els: {
    text: HTMLInputElement
    fontSize: HTMLInputElement
    fontSizeValue: HTMLOutputElement
    rotation: HTMLInputElement
    rotationValue: HTMLOutputElement
    strokeWidth: HTMLInputElement
    strokeWidthValue: HTMLOutputElement
    radius: HTMLInputElement
    radiusValue: HTMLOutputElement
    lineDash: HTMLInputElement
    lineDashValue: HTMLOutputElement
    lineCap: HTMLSelectElement
    lineJoin: HTMLSelectElement
    lineDashOffset: HTMLInputElement
    lineDashOffsetValue: HTMLOutputElement
    miterLimit: HTMLInputElement
    miterLimitValue: HTMLOutputElement
    fontFamily: HTMLInputElement
    fontBold: HTMLInputElement
    fontItalic: HTMLInputElement
    textStrokeWidth: HTMLInputElement
    textStrokeWidthValue: HTMLOutputElement
    pointShape: HTMLSelectElement
    pointRotation: HTMLInputElement
    pointRotationValue: HTMLOutputElement
    zIndex: HTMLInputElement
  }
  private feature: OlFeature<OlGeometry> | null = null
  private kind: FeatureStyleKind = 'polygon'
  private onCommit: (() => void) | null = null
  private openFlag = false
  private advancedOpen = false
  private outsideDown = false
  private mapDragged = false
  private geomChangeKey: import('ol/events').EventsKey | null = null

  private readonly onMapPointerDrag = (): void => {
    this.mapDragged = true
  }

  private readonly onDocPointerDown = (evt: PointerEvent): void => {
    if (!this.openFlag) return
    const t = evt.target as Node | null
    if (this.containsUi(t)) return
    this.outsideDown = true
    this.mapDragged = false
  }

  private readonly onDocPointerUp = (): void => {
    if (!this.outsideDown) return
    this.outsideDown = false
    if (this.mapDragged) {
      this.mapDragged = false
      return
    }
    this.hide()
  }

  private readonly onViewChange = (): void => {
    if (!this.openFlag) return
    this.reposition()
  }

  constructor(private readonly map: Map) {
    this.root = document.createElement('div')
    this.root.className = 'ec-sketch-style-popup'
    this.root.hidden = true
    this.root.innerHTML = `
      <div class="ec-sketch-style-popup__scroll">
        <div class="ec-sketch-style-popup__fields" data-section="basic"></div>
        <button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline ec-sketch-style-popup__advanced-toggle" aria-expanded="false">
          Options avancées
        </button>
        <div class="ec-sketch-style-popup__fields ec-sketch-style-popup__fields--advanced" data-section="advanced" hidden></div>
        <div class="ec-sketch-style-popup__actions">
          <button type="button" class="fr-btn fr-btn--sm ec-sketch-style-popup__ok">OK</button>
          <button type="button" class="fr-btn fr-btn--sm fr-btn--secondary ec-sketch-style-popup__cancel">Fermer</button>
        </div>
      </div>
    `
    this.basicFields = this.root.querySelector('[data-section="basic"]')!
    this.advancedFields = this.root.querySelector('[data-section="advanced"]')!
    this.advancedToggle = this.root.querySelector('.ec-sketch-style-popup__advanced-toggle')!

    this.basicFields.innerHTML = `
      <label class="ec-sketch-style-popup__field" data-field="text">
        <span>Texte</span>
        <input type="text" class="fr-input" data-input="text" />
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="fontSize">
        <span>Taille (<output data-output="fontSize">14</output> pt)</span>
        <input type="range" min="8" max="72" step="1" value="14" data-input="fontSize" />
      </label>
      <div class="ec-sketch-style-popup__field" data-field="fontColor" data-color-slot="fontColor"></div>
      <div class="ec-sketch-style-popup__field" data-field="textStrokeColor" data-color-slot="textStrokeColor"></div>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="rotation">
        <span>Rotation (<output data-output="rotation">0</output>°)</span>
        <input type="range" min="-180" max="180" step="1" value="0" data-input="rotation" />
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="radius">
        <span>Rayon (<output data-output="radius">6</output> px)</span>
        <input type="range" min="1" max="48" step="1" value="6" data-input="radius" />
      </label>
      <div class="ec-sketch-style-popup__field" data-field="fillColor" data-color-slot="fillColor"></div>
      <div class="ec-sketch-style-popup__field" data-field="strokeColor" data-color-slot="strokeColor"></div>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="strokeWidth">
        <span>Épaisseur (<output data-output="strokeWidth">2</output> px)</span>
        <input type="range" min="0" max="40" step="1" value="2" data-input="strokeWidth" />
      </label>
    `

    this.advancedFields.innerHTML = `
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="lineDash">
        <span>Tirets (<output data-output="lineDash">0</output> px, 0 = plein)</span>
        <input type="range" min="0" max="64" step="1" value="0" data-input="lineDash" />
      </label>
      <label class="ec-sketch-style-popup__field" data-field="lineCap">
        <span>Extrémités</span>
        <select class="fr-select" data-input="lineCap">
          <option value="butt">Coupées</option>
          <option value="round">Arrondies</option>
          <option value="square">Carrées</option>
        </select>
      </label>
      <label class="ec-sketch-style-popup__field" data-field="lineJoin">
        <span>Jonctions (coins du tracé)</span>
        <select class="fr-select" data-input="lineJoin">
          <option value="round">Arrondi</option>
          <option value="bevel">Biseau</option>
          <option value="miter">Pointe</option>
        </select>
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="lineDashOffset">
        <span>Décalage tirets (<output data-output="lineDashOffset">0</output>)</span>
        <input type="range" min="0" max="100" step="1" value="0" data-input="lineDashOffset" />
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="miterLimit">
        <span>Limite des pointes (<output data-output="miterLimit">10</output>)</span>
        <input type="range" min="1" max="50" step="0.5" value="10" data-input="miterLimit" />
      </label>
      <label class="ec-sketch-style-popup__field" data-field="fontFamily">
        <span>Police</span>
        <input type="text" class="fr-input" data-input="fontFamily" />
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--check" data-field="fontBold">
        <input type="checkbox" data-input="fontBold" />
        <span>Gras</span>
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--check" data-field="fontItalic">
        <input type="checkbox" data-input="fontItalic" />
        <span>Italique</span>
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="textStrokeWidth">
        <span>Épaisseur contour texte (<output data-output="textStrokeWidth">3</output> px)</span>
        <input type="range" min="0" max="20" step="1" value="3" data-input="textStrokeWidth" />
      </label>
      <label class="ec-sketch-style-popup__field" data-field="pointShape">
        <span>Forme du point</span>
        <select class="fr-select" data-input="pointShape">
          <option value="circle">Cercle</option>
          <option value="square">Carré</option>
          <option value="triangle">Triangle</option>
          <option value="star">Étoile</option>
        </select>
      </label>
      <label class="ec-sketch-style-popup__field ec-sketch-style-popup__field--range" data-field="pointRotation">
        <span>Rotation symbole (<output data-output="pointRotation">0</output>°)</span>
        <input type="range" min="-180" max="180" step="1" value="0" data-input="pointRotation" />
      </label>
      <label class="ec-sketch-style-popup__field" data-field="zIndex">
        <span>zIndex</span>
        <input type="number" min="0" max="9999" class="fr-input" data-input="zIndex" />
      </label>
    `

    this.colorPickers = {
      fontColor: new SketchColorPicker('Couleur du texte', '#000091'),
      textStrokeColor: new SketchColorPicker('Contour du texte', '#ffffff'),
      fillColor: new SketchColorPicker('Remplissage', 'rgba(0, 0, 145, 0.2)'),
      strokeColor: new SketchColorPicker('Contour', '#000091'),
    }
    for (const [key, picker] of Object.entries(this.colorPickers)) {
      const slot = this.basicFields.querySelector(`[data-color-slot="${key}"]`)
      slot?.appendChild(picker.root)
      picker.setOnChange(() => this.applyFromForm())
    }

    this.els = {
      text: this.root.querySelector('[data-input="text"]')!,
      fontSize: this.root.querySelector('[data-input="fontSize"]')!,
      fontSizeValue: this.root.querySelector('[data-output="fontSize"]')!,
      rotation: this.root.querySelector('[data-input="rotation"]')!,
      rotationValue: this.root.querySelector('[data-output="rotation"]')!,
      strokeWidth: this.root.querySelector('[data-input="strokeWidth"]')!,
      strokeWidthValue: this.root.querySelector('[data-output="strokeWidth"]')!,
      radius: this.root.querySelector('[data-input="radius"]')!,
      radiusValue: this.root.querySelector('[data-output="radius"]')!,
      lineDash: this.root.querySelector('[data-input="lineDash"]')!,
      lineDashValue: this.root.querySelector('[data-output="lineDash"]')!,
      lineCap: this.root.querySelector('[data-input="lineCap"]')!,
      lineJoin: this.root.querySelector('[data-input="lineJoin"]')!,
      lineDashOffset: this.root.querySelector('[data-input="lineDashOffset"]')!,
      lineDashOffsetValue: this.root.querySelector('[data-output="lineDashOffset"]')!,
      miterLimit: this.root.querySelector('[data-input="miterLimit"]')!,
      miterLimitValue: this.root.querySelector('[data-output="miterLimit"]')!,
      fontFamily: this.root.querySelector('[data-input="fontFamily"]')!,
      fontBold: this.root.querySelector('[data-input="fontBold"]')!,
      fontItalic: this.root.querySelector('[data-input="fontItalic"]')!,
      textStrokeWidth: this.root.querySelector('[data-input="textStrokeWidth"]')!,
      textStrokeWidthValue: this.root.querySelector('[data-output="textStrokeWidth"]')!,
      pointShape: this.root.querySelector('[data-input="pointShape"]')!,
      pointRotation: this.root.querySelector('[data-input="pointRotation"]')!,
      pointRotationValue: this.root.querySelector('[data-output="pointRotation"]')!,
      zIndex: this.root.querySelector('[data-input="zIndex"]')!,
    }

    const syncOutputs = () => {
      this.els.fontSizeValue.textContent = this.els.fontSize.value
      this.els.rotationValue.textContent = this.els.rotation.value
      this.els.strokeWidthValue.textContent = this.els.strokeWidth.value
      this.els.radiusValue.textContent = this.els.radius.value
      this.els.lineDashValue.textContent = this.els.lineDash.value
      this.els.lineDashOffsetValue.textContent = this.els.lineDashOffset.value
      this.els.miterLimitValue.textContent = this.els.miterLimit.value
      this.els.textStrokeWidthValue.textContent = this.els.textStrokeWidth.value
      this.els.pointRotationValue.textContent = this.els.pointRotation.value
    }

    const live = () => {
      syncOutputs()
      this.syncDependentFields()
      this.applyFromForm()
    }
    for (const input of Object.values(this.els)) {
      if (input instanceof HTMLOutputElement) continue
      input.addEventListener('input', live)
      input.addEventListener('change', live)
    }

    this.advancedToggle.addEventListener('click', () => {
      this.setAdvancedOpen(!this.advancedOpen)
    })

    this.root.querySelector('.ec-sketch-style-popup__ok')!.addEventListener('click', () => {
      this.applyFromForm()
      this.onCommit?.()
      this.hide()
    })
    this.root
      .querySelector('.ec-sketch-style-popup__cancel')!
      .addEventListener('click', () => this.hide())

    this.overlay = new Overlay({
      element: this.root,
      positioning: 'bottom-center',
      offset: [0, -8],
      stopEvent: true,
    })
    this.map.addOverlay(this.overlay)
  }

  open(feature: OlFeature<OlGeometry>, onCommit?: () => void): void {
    this.unbindOutside()
    this.feature = feature
    this.onCommit = onCommit ?? null
    this.kind = featureStyleKindOf(feature)
    this.setAdvancedOpen(false)
    const attrs = getFeatureStyleAttrs(feature)
    this.syncFieldsVisibility()
    this.fillForm(attrs)
    this.syncDependentFields()
    applyFeatureStyle(feature, attrs)
    this.root.hidden = false
    this.openFlag = true
    this.reposition()
    this.bindOutside()
    if (this.kind === 'text' && !this.els.text.closest('[hidden]')) {
      this.els.text.focus()
      this.els.text.select()
    }
  }

  hide(): void {
    this.unbindOutside()
    this.setAdvancedOpen(false)
    this.root.hidden = true
    this.overlay.setPosition(undefined)
    this.openFlag = false
    this.feature = null
    this.onCommit = null
    this.outsideDown = false
    this.mapDragged = false
    for (const p of Object.values(this.colorPickers)) p.close()
  }

  destroy(): void {
    this.hide()
    for (const p of Object.values(this.colorPickers)) p.destroy()
    this.map.removeOverlay(this.overlay)
    this.root.remove()
  }

  private setAdvancedOpen(open: boolean): void {
    this.advancedOpen = open
    this.advancedFields.hidden = !open
    this.advancedToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    this.advancedToggle.textContent = open ? 'Masquer les options avancées' : 'Options avancées'
  }

  private containsUi(node: Node | null): boolean {
    if (!node) return false
    if (this.root.contains(node)) return true
    return Object.values(this.colorPickers).some((p) => p.containsNode(node))
  }

  private bindOutside(): void {
    this.map.on('pointerdrag', this.onMapPointerDrag)
    this.map.getView().on('change:center', this.onViewChange)
    this.map.getView().on('change:resolution', this.onViewChange)
    document.addEventListener('pointerdown', this.onDocPointerDown, true)
    document.addEventListener('pointerup', this.onDocPointerUp, true)
    const geom = this.feature?.getGeometry()
    if (geom) {
      this.geomChangeKey = geom.on('change', this.onViewChange)
    }
  }

  private unbindOutside(): void {
    this.map.un('pointerdrag', this.onMapPointerDrag)
    this.map.getView().un('change:center', this.onViewChange)
    this.map.getView().un('change:resolution', this.onViewChange)
    document.removeEventListener('pointerdown', this.onDocPointerDown, true)
    document.removeEventListener('pointerup', this.onDocPointerUp, true)
    if (this.geomChangeKey) {
      unByKey(this.geomChangeKey)
      this.geomChangeKey = null
    }
  }

  /** Place la popup au-dessus d’un point d’ancrage sur la feature. */
  private reposition(): void {
    if (!this.feature || this.root.hidden) return
    const anchor = featureStylePopupAnchor(this.feature)
    if (anchor) this.overlay.setPosition(anchor)
  }

  private syncFieldsVisibility(): void {
    const basic = new Set(BASIC_BY_KIND[this.kind])
    const advanced = new Set(ADVANCED_BY_KIND[this.kind])
    for (const label of this.basicFields.querySelectorAll<HTMLElement>('[data-field]')) {
      label.hidden = !basic.has(label.dataset.field as BasicField)
    }
    for (const label of this.advancedFields.querySelectorAll<HTMLElement>('[data-field]')) {
      label.hidden = !advanced.has(label.dataset.field as AdvancedField)
    }
    const hasAdvanced = advanced.size > 0
    this.advancedToggle.hidden = !hasAdvanced
    if (!hasAdvanced) this.setAdvancedOpen(false)
    else this.advancedFields.hidden = !this.advancedOpen
  }

  /** Désactive les champs devenus non pertinents. */
  private syncDependentFields(): void {
    const dash = Number(this.els.lineDash.value) || 0
    const dashOffsetField = this.els.lineDashOffset.closest(
      '.ec-sketch-style-popup__field',
    ) as HTMLElement | null
    this.els.lineDashOffset.disabled = dash <= 0
    dashOffsetField?.classList.toggle('is-disabled', dash <= 0)

    const join = this.els.lineJoin.value
    const miterField = this.els.miterLimit.closest(
      '.ec-sketch-style-popup__field',
    ) as HTMLElement | null
    this.els.miterLimit.disabled = join !== 'miter'
    miterField?.classList.toggle('is-disabled', join !== 'miter')

    const shape = this.els.pointShape.value
    const rotField = this.els.pointRotation.closest(
      '.ec-sketch-style-popup__field',
    ) as HTMLElement | null
    this.els.pointRotation.disabled = shape === 'circle'
    rotField?.classList.toggle('is-disabled', shape === 'circle')
  }

  private fillForm(attrs: FeatureStyleAttrs): void {
    this.els.text.value = attrs.text
    this.els.fontSize.value = String(attrs.fontSize)
    this.els.fontSizeValue.textContent = this.els.fontSize.value
    this.colorPickers.fontColor.setValue(attrs.fontColor)
    this.colorPickers.textStrokeColor.setValue(attrs.textStrokeColor)
    this.els.rotation.value = String(Math.round(attrs.rotation))
    this.els.rotationValue.textContent = this.els.rotation.value
    this.colorPickers.strokeColor.setValue(attrs.strokeColor)
    this.els.strokeWidth.value = String(attrs.strokeWidth)
    this.els.strokeWidthValue.textContent = this.els.strokeWidth.value
    this.colorPickers.fillColor.setValue(attrs.fillColor)
    this.els.radius.value = String(attrs.radius)
    this.els.radiusValue.textContent = this.els.radius.value
    this.els.lineDash.value = String(attrs.lineDash)
    this.els.lineDashValue.textContent = this.els.lineDash.value
    this.els.lineCap.value = attrs.lineCap
    this.els.lineJoin.value = attrs.lineJoin
    this.els.lineDashOffset.value = String(attrs.lineDashOffset)
    this.els.lineDashOffsetValue.textContent = this.els.lineDashOffset.value
    this.els.miterLimit.value = String(attrs.miterLimit)
    this.els.miterLimitValue.textContent = this.els.miterLimit.value
    this.els.fontFamily.value = attrs.fontFamily
    this.els.fontBold.checked = attrs.fontBold
    this.els.fontItalic.checked = attrs.fontItalic
    this.els.textStrokeWidth.value = String(attrs.textStrokeWidth)
    this.els.textStrokeWidthValue.textContent = this.els.textStrokeWidth.value
    this.els.pointShape.value = attrs.pointShape
    this.els.pointRotation.value = String(attrs.pointRotation)
    this.els.pointRotationValue.textContent = this.els.pointRotation.value
    this.els.zIndex.value = String(attrs.zIndex)
  }

  private applyFromForm(): void {
    if (!this.feature) return
    const base = defaultFeatureStyleAttrs(this.kind)
    const dash = clamp(Number(this.els.lineDash.value), 0, 64, base.lineDash)
    const shape = (this.els.pointShape.value as PointShape) || base.pointShape
    const join = (this.els.lineJoin.value as StrokeLineJoin) || base.lineJoin
    const attrs: FeatureStyleAttrs = {
      ...base,
      text: this.els.text.value.trim() || base.text,
      fontSize: clamp(Number(this.els.fontSize.value), 8, 72, base.fontSize),
      fontColor: this.colorPickers.fontColor.getValue(),
      textStrokeColor: this.colorPickers.textStrokeColor.getValue(),
      rotation: Number(this.els.rotation.value) || 0,
      strokeColor: this.colorPickers.strokeColor.getValue(),
      strokeWidth: clamp(Number(this.els.strokeWidth.value), 0, 40, base.strokeWidth),
      fillColor: this.colorPickers.fillColor.getValue(),
      radius: clamp(Number(this.els.radius.value), 1, 48, base.radius),
      lineDash: dash,
      lineCap: (this.els.lineCap.value as StrokeLineCap) || base.lineCap,
      lineJoin: join,
      lineDashOffset:
        dash <= 0 ? 0 : clamp(Number(this.els.lineDashOffset.value), 0, 100, base.lineDashOffset),
      miterLimit:
        join !== 'miter'
          ? base.miterLimit
          : clamp(Number(this.els.miterLimit.value), 1, 50, base.miterLimit),
      fontFamily: this.els.fontFamily.value.trim() || base.fontFamily,
      fontBold: this.els.fontBold.checked,
      fontItalic: this.els.fontItalic.checked,
      textStrokeWidth: clamp(Number(this.els.textStrokeWidth.value), 0, 20, base.textStrokeWidth),
      pointShape: shape,
      pointRotation:
        shape === 'circle'
          ? 0
          : clamp(Number(this.els.pointRotation.value), -180, 180, base.pointRotation),
      zIndex: clamp(Number(this.els.zIndex.value), 0, 9999, base.zIndex),
    }
    applyFeatureStyle(this.feature, attrs)
  }
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
