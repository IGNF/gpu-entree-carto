/**
 * Panneau réglages (roue crantée) — démo mountSketch, options croquis à chaud.
 */
import type Map from 'ol/Map'
import { toLonLat } from 'ol/proj'
import type { MountSketchOptions } from './mountSketch'
import type { SketchExtraTool } from '@/geometry-editor/SketchControl'
import type { GeometryTypeOption, ToolsToggleCorner } from '@/geometry-editor/types'
import { GEOMETRY_TYPE_NAMES } from '@/geometry-editor/types'
import { appendGeometryToolIcon } from '@/geometry-editor/geometryToolIcons'

const TOOLS_TOGGLE_VALUES: Array<ToolsToggleCorner | ''> = [
  '',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

const EXTRA_TOOL_IDS: SketchExtraTool[] = [
  'Text',
  'Import',
  'Export',
  'MeasureDistance',
  'MeasureArea',
]

const LON_LAT_DECIMALS = 7
const ZOOM_DECIMALS = 1
const LON_LAT_STEP = 10 ** -LON_LAT_DECIMALS
const ZOOM_STEP = 10 ** -ZOOM_DECIMALS

export type ResolvedMountSketchOptions = MountSketchOptions & {
  width: string | number
  height: string | number
  lon: number
  lat: number
  zoom: number
  minZoom: number
  maxZoom: number
  showZoom: boolean
  showSettings: boolean
  toolsToggle: ToolsToggleCorner | null
  geometryType: GeometryTypeOption
  clearAll: boolean
  history: boolean
  enableFeatureStyleEditor: boolean
  localStorageKey: string | null
  extraTools: SketchExtraTool[]
  zIndex: number
}

export interface SketchSettingsHost {
  getOptions(): Readonly<ResolvedMountSketchOptions>
  getInitialOptions(): Readonly<ResolvedMountSketchOptions>
  getMap(): Map
  setOptions(patch: Partial<MountSketchOptions>): void
  resetOptions(): void
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export class SketchSettingsPanel {
  private readonly host: SketchSettingsHost
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

  constructor(host: SketchSettingsHost, mapHost: HTMLElement) {
    this.host = host
    this.mapHost = mapHost

    this.root = document.createElement('div')
    this.root.className = 'ec-sketch-settings'

    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className =
      'ec-geometry-editor__tool ec-geometry-editor__tool--settings ec-sketch-settings__toggle'
    this.button.setAttribute('aria-label', 'Options du croquis')
    this.button.setAttribute('aria-pressed', 'false')
    this.button.setAttribute('aria-expanded', 'false')
    this.button.setAttribute('aria-haspopup', 'dialog')
    this.button.addEventListener('click', () => this.toggle())
    appendGeometryToolIcon(this.button, 'ec-geometry-editor__tool--settings')
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
    this.button.setAttribute('aria-pressed', 'true')
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
    this.button.setAttribute('aria-pressed', 'false')
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
    const view = this.host.getMap().getView()
    if (active) {
      view.on('change:center', this.onViewChange)
      view.on('change:resolution', this.onViewChange)
    } else {
      view.un('change:center', this.onViewChange)
      view.un('change:resolution', this.onViewChange)
    }
  }

  private buildDialog(): HTMLElement {
    const opts = this.host.getOptions()
    const viewState = this.readCurrentView(opts)
    const dialog = document.createElement('div')
    dialog.className = 'ec-geometry-editor__settings-dialog ec-sketch-settings__dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-label', 'Options du croquis')

    const form = document.createElement('form')
    form.className = 'ec-geometry-editor__settings-form'
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.applyForm(form)
    })
    this.form = form

    const title = document.createElement('p')
    title.className = 'ec-geometry-editor__settings-title'
    title.textContent = 'Options croquis'
    form.appendChild(title)

    form.appendChild(this.geometryTypeField(String(opts.geometryType)))
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

    form.appendChild(this.numberField('height', 'Hauteur (px)', Number(opts.height) || 480, 1))
    form.appendChild(this.textField('width', 'Largeur', String(opts.width)))
    form.appendChild(this.numberField('lon', 'Longitude courante', viewState.lon, LON_LAT_STEP))
    form.appendChild(this.numberField('lat', 'Latitude courante', viewState.lat, LON_LAT_STEP))
    form.appendChild(this.numberField('zoom', 'Zoom courant', viewState.zoom, ZOOM_STEP))
    form.appendChild(this.numberField('minZoom', 'Zoom min', opts.minZoom, 1))
    form.appendChild(this.numberField('maxZoom', 'Zoom max', opts.maxZoom, 1))
    form.appendChild(this.numberField('zIndex', 'zIndex couche', opts.zIndex, 1))

    form.appendChild(this.checkField('showZoom', 'Contrôle zoom', opts.showZoom))
    form.appendChild(this.checkField('showSettings', 'Bouton réglages', opts.showSettings))
    form.appendChild(this.checkField('clearAll', 'Tout supprimer', opts.clearAll))
    form.appendChild(this.checkField('history', 'Annuler / Rétablir', opts.history))
    form.appendChild(
      this.checkField(
        'enableFeatureStyleEditor',
        'Popup style à la création',
        opts.enableFeatureStyleEditor,
      ),
    )
    form.appendChild(
      this.textField(
        'localStorageKey',
        'Clé localStorage (vide = off)',
        opts.localStorageKey ?? '',
      ),
    )

    const extraLegend = document.createElement('fieldset')
    extraLegend.className = 'ec-geometry-editor__settings-field'
    const extraTitle = document.createElement('span')
    extraTitle.textContent = 'extraTools'
    extraLegend.appendChild(extraTitle)
    for (const id of EXTRA_TOOL_IDS) {
      extraLegend.appendChild(this.extraToolCheck(id, opts.extraTools.includes(id)))
    }
    form.appendChild(extraLegend)

    const actions = document.createElement('div')
    actions.className = 'ec-geometry-editor__settings-actions'

    const applyBtn = document.createElement('button')
    applyBtn.type = 'submit'
    applyBtn.className = 'fr-btn fr-btn--sm fr-btn--primary'
    applyBtn.textContent = 'Appliquer'

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className = 'fr-btn fr-btn--sm fr-btn--secondary'
    resetBtn.textContent = 'Réinitialiser'
    resetBtn.title = 'Remettre les options du chargement de la page'
    resetBtn.addEventListener('click', () => this.resetToInitial())

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'fr-btn fr-btn--sm fr-btn--tertiary'
    cancelBtn.textContent = 'Fermer'
    cancelBtn.addEventListener('click', () => this.close())

    actions.append(applyBtn, resetBtn, cancelBtn)
    form.appendChild(actions)
    dialog.appendChild(form)
    return dialog
  }

  private resetToInitial(): void {
    this.host.resetOptions()
    if (!this.host.getOptions().showSettings) {
      this.close()
      return
    }
    this.bindViewListeners(false)
    this.dialog?.remove()
    this.dialog = this.buildDialog()
    this.mapHost.appendChild(this.dialog)
    this.bindViewListeners(true)
  }

  private readCurrentView(opts: Readonly<ResolvedMountSketchOptions>): {
    lon: number
    lat: number
    zoom: number
  } {
    const view = this.host.getMap().getView()
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

  private syncViewFieldsFromMap(): void {
    if (!this.open || !this.form) return
    const viewState = this.readCurrentView(this.host.getOptions())
    this.setNumberIfIdle(this.form, 'lon', viewState.lon)
    this.setNumberIfIdle(this.form, 'lat', viewState.lat)
    this.setNumberIfIdle(this.form, 'zoom', viewState.zoom)
  }

  private setNumberIfIdle(form: HTMLFormElement, name: string, value: number): void {
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

    const extraTools: SketchExtraTool[] = []
    for (const id of EXTRA_TOOL_IDS) {
      if (fd.get(`extraTool_${id}`) === 'on') extraTools.push(id)
    }

    const lsRaw = String(fd.get('localStorageKey') ?? '').trim()

    const patch: Partial<MountSketchOptions> = {
      geometryType: String(fd.get('geometryType')) as GeometryTypeOption,
      height: num('height'),
      width: String(fd.get('width') ?? '100%'),
      lon: roundTo(num('lon'), LON_LAT_DECIMALS),
      lat: roundTo(num('lat'), LON_LAT_DECIMALS),
      zoom: roundTo(num('zoom'), ZOOM_DECIMALS),
      minZoom: num('minZoom'),
      maxZoom: num('maxZoom'),
      zIndex: num('zIndex'),
      showZoom: bool('showZoom'),
      showSettings: bool('showSettings'),
      clearAll: bool('clearAll'),
      history: bool('history'),
      enableFeatureStyleEditor: bool('enableFeatureStyleEditor'),
      localStorageKey: lsRaw === '' ? null : lsRaw,
      extraTools,
      toolsToggle: (() => {
        const v = String(fd.get('toolsToggle') ?? '')
        return v === '' ? null : (v as ToolsToggleCorner)
      })(),
    }

    this.host.setOptions(patch)
    if (this.host.getOptions().showSettings) {
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

  private geometryTypeField(current: string): HTMLElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.name = 'geometryType'
    input.value = current
    input.className = 'fr-input'
    input.setAttribute('list', 'ec-sketch-type-list')
    input.placeholder = 'Point,Disc ou Geometry…'

    const list = document.createElement('datalist')
    list.id = 'ec-sketch-type-list'
    for (const name of GEOMETRY_TYPE_NAMES) {
      const opt = document.createElement('option')
      opt.value = name
      list.appendChild(opt)
    }

    const wrap = this.fieldWrap('geometryType', input)
    wrap.appendChild(list)
    return wrap
  }

  private textField(name: string, label: string, value: string): HTMLElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.name = name
    input.value = value
    input.className = 'fr-input'
    return this.fieldWrap(label, input)
  }

  private numberField(name: string, label: string, value: number, step: number): HTMLElement {
    const input = document.createElement('input')
    input.type = 'number'
    input.name = name
    input.value = String(value)
    input.step = String(step)
    input.className = 'fr-input'
    return this.fieldWrap(label, input)
  }

  private checkField(name: string, label: string, checked: boolean): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = name
    input.checked = checked
    const wrap = document.createElement('label')
    wrap.className = 'ec-geometry-editor__settings-field ec-geometry-editor__settings-field--check'
    wrap.append(input, document.createTextNode(` ${label}`))
    return wrap
  }

  private extraToolCheck(id: SketchExtraTool, checked: boolean): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = `extraTool_${id}`
    input.checked = checked
    const wrap = document.createElement('label')
    wrap.className = 'ec-geometry-editor__settings-field ec-geometry-editor__settings-field--check'
    wrap.append(input, document.createTextNode(` ${id}`))
    return wrap
  }

  private selectField(
    name: string,
    label: string,
    values: Array<string>,
    current: string,
    labels?: Record<string, string>,
  ): HTMLElement {
    const select = document.createElement('select')
    select.name = name
    select.className = 'fr-select'
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
