/**
 * Couche cadastre basse échelle (gpu-client `layer.CadastreLow`) :
 * PCI Express par défaut, BD Parcellaire ou PCI Vecteur (inspire) selon typeref + INSEE.
 */
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import { createGeopfWmtsSource } from '@/ol/createGeopfWmtsSource'
import { dgfInspireCadastreAttributions } from '@/ol/ignGeoportalAttributions'

const INSPIRE_WMS_TEMPLATE = 'https://inspire.cadastre.gouv.fr/scpc/<inseeCommune>.wms'

function createInspireWmsSource(inseeCommune: string): TileWMS {
  const url = INSPIRE_WMS_TEMPLATE.replace('<inseeCommune>', inseeCommune)
  return new TileWMS({
    url,
    params: {
      LAYERS: 'AMORCES_CAD,CP.CadastralParcel',
      FORMAT: 'image/png',
      STYLES: 'DEFAULT',
      CRS: 'EPSG:3857',
      VERSION: '1.3.0',
      EXCEPTIONS: 'INIMAGE',
      SERVICE: 'WMS',
      REQUEST: 'GetMap',
      WIDTH: '256',
      HEIGHT: '256',
      TRANSPARENT: 'TRUE',
    },
    attributions: dgfInspireCadastreAttributions(),
    crossOrigin: 'anonymous',
  })
}

export class GpuCadastreLowLayer extends TileLayer {
  private readonly pciExpressSource = createGeopfWmtsSource({
    layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
    style: 'PCI vecteur',
  })

  private readonly bdParcellaireSource = createGeopfWmtsSource({
    layer: 'CADASTRALPARCELS.PARCELS',
    style: 'bdparcellaire',
  })

  private inspireSource: TileWMS

  private currentInseeCommune: string | null = null

  constructor(options?: { maxResolution?: number; visible?: boolean }) {
    super({
      visible: options?.visible ?? false,
      maxResolution: options?.maxResolution,
      source: createGeopfWmtsSource({
        layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
        style: 'PCI vecteur',
      }),
    })
    this.inspireSource = createInspireWmsSource('00000')
    this.setInseeCommune(null, null)
  }

  /**
   * - Sans INSEE : PCI Express
   * - INSEE + typeref `01` : WMS inspire PCI Vecteur
   * - INSEE + autre typeref (ou absent) : BD Parcellaire WMTS
   */
  setInseeCommune(inseeCommune: string | null | undefined, typeref?: string | null): void {
    const insee = inseeCommune?.trim() || null
    if (!insee) {
      this.setSource(this.pciExpressSource)
      this.currentInseeCommune = null
      return
    }
    if (typeref === '01') {
      if (this.currentInseeCommune !== insee) {
        this.inspireSource = createInspireWmsSource(insee)
        this.currentInseeCommune = insee
      }
      this.setSource(this.inspireSource)
      return
    }
    this.currentInseeCommune = insee
    this.setSource(this.bdParcellaireSource)
  }
}

let registeredCadastreLow: GpuCadastreLowLayer | null = null

export function registerGpuCadastreLowLayer(layer: GpuCadastreLowLayer): void {
  registeredCadastreLow = layer
}

export function getGpuCadastreLowLayer(): GpuCadastreLowLayer | null {
  return registeredCadastreLow
}

export function resetGpuCadastreLowLayer(): void {
  registeredCadastreLow?.setInseeCommune(null, null)
}
