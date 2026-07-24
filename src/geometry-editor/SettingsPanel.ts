/**
 * Panneau réglages (roue crantée) — formulaire des options à chaud.
 */
import type { GeometryEditor } from './GeometryEditor'
import type {
  GeometryEditorOptions,
  GeometryOutputFormat,
  GeometryTypeOption,
} from './types'

const GEOMETRY_TYPES: GeometryTypeOption[] = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'Rectangle',
  'Geometry',
]

const OUTPUT_FORMATS: GeometryOutputFormat[] = ['geojson', 'kml']

export class SettingsPanel {
  private readonly editor: GeometryEditor
  private readonly mapHost: HTMLElement
  private readonly root: HTMLElement
  private readonly button: HTMLButtonElement
  private dialog: HTMLElement | null = null
  private open = false
  private readonly onDocPointerDown = (evt: PointerEvent): void => {
    if (!this.open || !this.dialog) return
    const t = evt.target as Node
    if (this.root.contains(t) || this.dialog.contains(t)) return
    this.close()
  }

  constructor(editor: GeometryEditor, mapHost: HTMLElement) {
    this.editor = editor
    this.mapHost = mapHost

    this.root = document.createElement('div')
    this.root.className = 'ec-geometry-editor__settings'

    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className =
      'ec-geometry-editor__tool ec-geometry-editor__tool--settings'
    this.button.title = 'Options de la carte'
    this.button.setAttribute('aria-label', 'Options de la carte')
    this.button.setAttribute('aria-expanded', 'false')
    this.button.setAttribute('aria-haspopup', 'dialog')
    this.button.addEventListener('click', () => this.toggle())
    this.root.appendChild(this.button)

    this.mapHost.appendChild(this.root)
  }

  toggle(): void {
    if (this.open) this.close()
    else this.openDialog()
  }

  openDialog(): void {
    if (this.open) return
    this.open = true
    this.button.setAttribute('aria-expanded', 'true')
    this.button.classList.add('is-active')
    this.dialog = this.buildDialog()
    this.mapHost.appendChild(this.dialog)
    document.addEventListener('pointerdown', this.onDocPointerDown, true)
  }

  close(): void {
    if (!this.open) return
    this.open = false
    this.button.setAttribute('aria-expanded', 'false')
    this.button.classList.remove('is-active')
    this.dialog?.remove()
    this.dialog = null
    document.removeEventListener('pointerdown', this.onDocPointerDown, true)
  }

  destroy(): void {
    this.close()
    this.root.remove()
  }

  private buildDialog(): HTMLElement {
    const opts = this.editor.getOptions()
    const dialog = document.createElement('div')
    dialog.className = 'ec-geometry-editor__settings-dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-label', 'Options de l’éditeur')

    const form = document.createElement('form')
    form.className = 'ec-geometry-editor__settings-form'
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.applyForm(form)
    })

    const title = document.createElement('p')
    title.className = 'ec-geometry-editor__settings-title'
    title.textContent = 'Options'
    form.appendChild(title)

    form.appendChild(
      this.selectField('geometryType', 'Type de géométrie', GEOMETRY_TYPES, opts.geometryType),
    )
    form.appendChild(
      this.selectField('outputFormat', 'Format de sortie', OUTPUT_FORMATS, opts.outputFormat),
    )

    form.appendChild(
      this.numberField('height', 'Hauteur (px)', Number(opts.height) || 400),
    )
    form.appendChild(
      this.textField('width', 'Largeur', String(opts.width)),
    )
    form.appendChild(this.numberField('lon', 'Longitude', opts.lon, 0.0000001))
    form.appendChild(this.numberField('lat', 'Latitude', opts.lat, 0.0000001))
    form.appendChild(this.numberField('zoom', 'Zoom', opts.zoom, 0.1))
    form.appendChild(this.numberField('minZoom', 'Zoom min', opts.minZoom, 1))
    form.appendChild(this.numberField('maxZoom', 'Zoom max', opts.maxZoom, 1))
    form.appendChild(
      this.numberField('precision', 'Précision', opts.precision, 1),
    )

    form.appendChild(this.checkField('editable', 'Éditable', opts.editable))
    form.appendChild(
      this.checkField('centerOnResults', 'Recadrer sur les résultats', opts.centerOnResults),
    )
    form.appendChild(this.checkField('blockView', 'Bloquer la vue', opts.blockView))
    form.appendChild(this.checkField('showZoom', 'Contrôle zoom', opts.showZoom))
    form.appendChild(
      this.checkField('showAttributions', 'Attributions', opts.showAttributions),
    )
    form.appendChild(
      this.checkField('showSettings', 'Bouton réglages', opts.showSettings),
    )
    form.appendChild(this.checkField('hide', 'Masquer le champ source', opts.hide))

    const actions = document.createElement('div')
    actions.className = 'ec-geometry-editor__settings-actions'

    const applyBtn = document.createElement('button')
    applyBtn.type = 'submit'
    applyBtn.className = 'ec-geometry-editor__settings-apply'
    applyBtn.textContent = 'Appliquer'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ec-geometry-editor__settings-cancel'
    cancelBtn.textContent = 'Fermer'
    cancelBtn.addEventListener('click', () => this.close())

    actions.append(applyBtn, cancelBtn)
    form.appendChild(actions)
    dialog.appendChild(form)
    return dialog
  }

  private applyForm(form: HTMLFormElement): void {
    const fd = new FormData(form)
    const num = (name: string): number => Number(fd.get(name))
    const bool = (name: string): boolean => fd.get(name) === 'on'

    const patch: GeometryEditorOptions = {
      geometryType: String(fd.get('geometryType')) as GeometryTypeOption,
      outputFormat: String(fd.get('outputFormat')) as GeometryOutputFormat,
      height: num('height'),
      width: String(fd.get('width') ?? '100%'),
      lon: num('lon'),
      lat: num('lat'),
      zoom: num('zoom'),
      minZoom: num('minZoom'),
      maxZoom: num('maxZoom'),
      precision: num('precision'),
      editable: bool('editable'),
      centerOnResults: bool('centerOnResults'),
      blockView: bool('blockView'),
      showZoom: bool('showZoom'),
      showAttributions: bool('showAttributions'),
      showSettings: bool('showSettings'),
      hide: bool('hide'),
    }

    this.editor.setOptions(patch)
    if (this.editor.getOptions().showSettings) {
      this.close()
    }
  }

  private fieldWrap(labelText: string, control: HTMLElement): HTMLElement {
    const wrap = document.createElement('label')
    wrap.className = 'ec-geometry-editor__settings-field'
    const span = document.createElement('span')
    span.textContent = labelText
    wrap.append(span, control)
    return wrap
  }

  private textField(name: string, label: string, value: string): HTMLElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.name = name
    input.value = value
    return this.fieldWrap(label, input)
  }

  private numberField(
    name: string,
    label: string,
    value: number,
    step = 1,
  ): HTMLElement {
    const input = document.createElement('input')
    input.type = 'number'
    input.name = name
    input.value = String(value)
    input.step = String(step)
    return this.fieldWrap(label, input)
  }

  private checkField(name: string, label: string, checked: boolean): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = name
    input.checked = checked
    const wrap = document.createElement('label')
    wrap.className =
      'ec-geometry-editor__settings-field ec-geometry-editor__settings-field--check'
    wrap.append(input, document.createTextNode(` ${label}`))
    return wrap
  }

  private selectField(
    name: string,
    label: string,
    values: string[],
    current: string,
  ): HTMLElement {
    const select = document.createElement('select')
    select.name = name
    for (const v of values) {
      const opt = document.createElement('option')
      opt.value = v
      opt.textContent = v
      if (v === current) opt.selected = true
      select.appendChild(opt)
    }
    return this.fieldWrap(label, select)
  }
}
