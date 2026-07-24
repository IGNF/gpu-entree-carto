/**
 * Panneau réglages (roue crantée) — formulaire des options à chaud.
 */
import type Map from 'ol/Map'
import { toLonLat } from 'ol/proj'
import type {
  GeometryEditorOptions,
  GeometryOutputFormat,
  GeometryTypeOption,
  ToolsToggleCorner,
} from './types'
import { DEFAULT_GEOMETRY_EDITOR_OPTIONS } from './types'

const GEOMETRY_TYPES: GeometryTypeOption[] = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'Rectangle',
  'Circle',
  'Disc',
  'Geometry',
]

const OUTPUT_FORMATS: GeometryOutputFormat[] = ['geojson', 'kml']

const TOOLS_TOGGLE_VALUES: Array<ToolsToggleCorner | ''> = [
  '',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

/** Décimales lon/lat : compatible step HTML + validation navigateur. */
const LON_LAT_DECIMALS = 7
const ZOOM_DECIMALS = 1
const LON_LAT_STEP = 10 ** -LON_LAT_DECIMALS
const ZOOM_STEP = 10 ** -ZOOM_DECIMALS

type ResolvedOptions = typeof DEFAULT_GEOMETRY_EDITOR_OPTIONS &
  GeometryEditorOptions

/** API minimale — évite l’import circulaire avec GeometryEditor. */
export interface SettingsEditorHost {
  getOptions(): Readonly<ResolvedOptions>
  getInitialOptions(): Readonly<ResolvedOptions>
  getMap(): Map
  setOptions(patch: GeometryEditorOptions): void
  resetOptions(): void
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export class SettingsPanel {
  private readonly editor: SettingsEditorHost
  private readonly mapHost: HTMLElement
  private readonly root: HTMLElement
  private readonly button: HTMLButtonElement
  private dialog: HTMLElement | null = null
  private form: HTMLFormElement | null = null
  private open = false
  private readonly onDocPointerDown = (evt: PointerEvent): void => {
    if (!this.open || !this.dialog) return
    const t = evt.target as Node
    if (this.root.contains(t) || this.dialog.contains(t)) return
    this.close()
  }
  private readonly onViewChange = (): void => {
    this.syncViewFieldsFromMap()
  }

  constructor(editor: SettingsEditorHost, mapHost: HTMLElement) {
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
    this.bindViewListeners(true)
  }

  close(): void {
    if (!this.open) return
    this.open = false
    this.button.setAttribute('aria-expanded', 'false')
    this.button.classList.remove('is-active')
    this.bindViewListeners(false)
    this.dialog?.remove()
    this.dialog = null
    this.form = null
    document.removeEventListener('pointerdown', this.onDocPointerDown, true)
  }

  destroy(): void {
    this.close()
    this.root.remove()
  }

  private bindViewListeners(active: boolean): void {
    const view = this.editor.getMap().getView()
    if (active) {
      view.on('change:center', this.onViewChange)
      view.on('change:resolution', this.onViewChange)
    } else {
      view.un('change:center', this.onViewChange)
      view.un('change:resolution', this.onViewChange)
    }
  }

  private buildDialog(): HTMLElement {
    const opts = this.editor.getOptions()
    const viewState = this.readCurrentView(opts)
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
    this.form = form

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
    form.appendChild(
      this.numberField('lon', 'Longitude courante', viewState.lon, LON_LAT_STEP),
    )
    form.appendChild(
      this.numberField('lat', 'Latitude courante', viewState.lat, LON_LAT_STEP),
    )
    form.appendChild(
      this.numberField('zoom', 'Zoom courant', viewState.zoom, ZOOM_STEP),
    )
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
    form.appendChild(
      this.selectField(
        'toolsToggle',
        'Menu outils (toolsToggle)',
        TOOLS_TOGGLE_VALUES,
        opts.toolsToggle ?? '',
        {
          '': '(toujours visibles)',
          'top-left': 'top-left',
          'top-right': 'top-right',
          'bottom-left': 'bottom-left',
          'bottom-right': 'bottom-right',
        },
      ),
    )
    form.appendChild(this.checkField('hide', 'Masquer le champ source', opts.hide))

    const actions = document.createElement('div')
    actions.className = 'ec-geometry-editor__settings-actions'

    const applyBtn = document.createElement('button')
    applyBtn.type = 'submit'
    applyBtn.className = 'ec-geometry-editor__settings-apply'
    applyBtn.textContent = 'Appliquer'

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className = 'ec-geometry-editor__settings-reset'
    resetBtn.textContent = 'Réinitialiser'
    resetBtn.title = 'Remettre les options du chargement de la page'
    resetBtn.addEventListener('click', () => this.resetToInitial())

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ec-geometry-editor__settings-cancel'
    cancelBtn.textContent = 'Fermer'
    cancelBtn.addEventListener('click', () => this.close())

    actions.append(applyBtn, resetBtn, cancelBtn)
    form.appendChild(actions)
    dialog.appendChild(form)
    return dialog
  }

  /** Restaure les options du mount initial et rafraîchit le formulaire. */
  private resetToInitial(): void {
    this.editor.resetOptions()
    if (!this.editor.getOptions().showSettings) {
      this.close()
      return
    }
    this.bindViewListeners(false)
    this.dialog?.remove()
    this.dialog = this.buildDialog()
    this.mapHost.appendChild(this.dialog)
    this.bindViewListeners(true)
  }

  /** Vue actuelle tronquée (validation HTML number + step). */
  private readCurrentView(opts: Readonly<ResolvedOptions>): {
    lon: number
    lat: number
    zoom: number
  } {
    const view = this.editor.getMap().getView()
    const zoom = roundTo(view.getZoom() ?? opts.zoom, ZOOM_DECIMALS)
    const center = view.getCenter()
    if (center) {
      const [lon, lat] = toLonLat(center)
      return {
        lon: roundTo(lon, LON_LAT_DECIMALS),
        lat: roundTo(lat, LON_LAT_DECIMALS),
        zoom,
      }
    }
    return {
      lon: roundTo(opts.lon, LON_LAT_DECIMALS),
      lat: roundTo(opts.lat, LON_LAT_DECIMALS),
      zoom,
    }
  }

  /**
   * Met à jour lon / lat / zoom dans le formulaire ouvert.
   * Ne touche pas un champ en cours d’édition (focus).
   */
  private syncViewFieldsFromMap(): void {
    if (!this.open || !this.form) return
    const viewState = this.readCurrentView(this.editor.getOptions())
    this.setNumberIfIdle(this.form, 'lon', viewState.lon)
    this.setNumberIfIdle(this.form, 'lat', viewState.lat)
    this.setNumberIfIdle(this.form, 'zoom', viewState.zoom)
  }

  private setNumberIfIdle(
    form: HTMLFormElement,
    name: string,
    value: number,
  ): void {
    const input = form.elements.namedItem(name)
    if (!(input instanceof HTMLInputElement)) return
    if (document.activeElement === input) return
    const next = String(value)
    if (input.value === next) return
    input.value = next
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
      lon: roundTo(num('lon'), LON_LAT_DECIMALS),
      lat: roundTo(num('lat'), LON_LAT_DECIMALS),
      zoom: roundTo(num('zoom'), ZOOM_DECIMALS),
      minZoom: num('minZoom'),
      maxZoom: num('maxZoom'),
      precision: num('precision'),
      editable: bool('editable'),
      centerOnResults: bool('centerOnResults'),
      blockView: bool('blockView'),
      showZoom: bool('showZoom'),
      showAttributions: bool('showAttributions'),
      showSettings: bool('showSettings'),
      toolsToggle: (() => {
        const v = String(fd.get('toolsToggle') ?? '')
        return v === '' ? null : (v as ToolsToggleCorner)
      })(),
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
    labels?: Record<string, string>,
  ): HTMLElement {
    const select = document.createElement('select')
    select.name = name
    for (const v of values) {
      const opt = document.createElement('option')
      opt.value = v
      opt.textContent = labels?.[v] ?? v
      if (v === current) opt.selected = true
      select.appendChild(opt)
    }
    return this.fieldWrap(label, select)
  }
}
