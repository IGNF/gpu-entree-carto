/**
 * Options alignées sur ol-geometry-editor (sous-ensemble utile + format KML).
 */
import type { StyleLike } from 'ol/style/Style'
import type { GeometryTypeName } from './geometryTypeUtils'

export type { GeometryTypeName } from './geometryTypeUtils'
export { GEOMETRY_TYPE_NAMES } from './geometryTypeUtils'

/**
 * Type(s) de géométrie autorisé(s).
 * Un seul nom (`'Polygon'`, `'MultiDisc'`, …) ou plusieurs séparés par des virgules
 * (`'Point,Disc'`) pour n’afficher que ces outils (comme `Geometry`, mais filtré).
 */
export type GeometryTypeOption = GeometryTypeName | (string & {})

export type GeometryOutputFormat = 'geojson' | 'kml'

/**
 * Coin où placer le bouton qui ouvre / ferme la barre d’outils de dessin.
 * `null` → outils toujours visibles (colonne à gauche, comportement historique).
 */
export type ToolsToggleCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type { StyleLike }

export interface TileLayerConfig {
  url: string
  attribution?: string
  title?: string
  maxZoom?: number
}

export interface GeometryEditorOptions {
  /**
   * Type(s) de géométrie : un nom, ou une liste séparée par des virgules
   * (ex. `'Point,LineString,Disc'`).
   */
  geometryType?: GeometryTypeOption
  /** Masquer le champ / élément source. */
  hide?: boolean
  editable?: boolean
  tileLayers?: TileLayerConfig[]
  width?: string | number
  height?: string | number
  lon?: number
  lat?: number
  zoom?: number
  maxZoom?: number
  minZoom?: number
  centerOnResults?: boolean
  precision?: number
  /** Format écrit dans l’élément (lecture auto GeoJSON / KML / bbox). */
  outputFormat?: GeometryOutputFormat
  /** Classe CSS du conteneur carte. */
  className?: string
  /**
   * Bloque le pan / zoom manuel (molette, drag, double-clic, pinch, clavier, contrôle +/-).
   * Le recentrage programmatique (`centerOnResults` / `fitToFeatures`) reste possible.
   */
  blockView?: boolean
  /** Affiche les boutons +/- de zoom (ignoré si `blockView` est true). */
  showZoom?: boolean
  /** Affiche le bouton réglages (roue crantée) pour modifier les options à chaud. */
  showSettings?: boolean
  /** Affiche le contrôle d’attributions des couches de fond. */
  showAttributions?: boolean
  /**
   * Si non `null`, remplace l’affichage permanent des outils de dessin par un bouton
   * dans le coin indiqué ; un clic ouvre / ferme la barre d’outils
   * (dessous si `top-*`, dessus si `bottom-*`).
   */
  toolsToggle?: ToolsToggleCorner | null
  /**
   * Style OpenLayers des features (et du croquis en cours).
   * `null` / omis → style bleu France par défaut.
   */
  customStyle?: StyleLike | null
}

export const DEFAULT_GEOMETRY_EDITOR_OPTIONS: Required<
  Pick<
    GeometryEditorOptions,
    | 'geometryType'
    | 'hide'
    | 'editable'
    | 'width'
    | 'height'
    | 'lon'
    | 'lat'
    | 'zoom'
    | 'minZoom'
    | 'maxZoom'
    | 'centerOnResults'
    | 'precision'
    | 'outputFormat'
    | 'blockView'
    | 'showZoom'
    | 'showSettings'
    | 'showAttributions'
    | 'toolsToggle'
  >
> & {
  tileLayers: TileLayerConfig[]
  customStyle: StyleLike | null
} = {
  geometryType: 'Geometry',
  hide: true,
  editable: true,
  tileLayers: [
    {
      title: 'Plan IGN',
      url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      attribution: '© IGN — Géoplateforme',
      maxZoom: 19,
    },
  ],
  width: '100%',
  height: 400,
  lon: 2.0,
  lat: 46.5,
  zoom: 5,
  minZoom: 4,
  maxZoom: 19,
  centerOnResults: true,
  precision: 7,
  outputFormat: 'geojson',
  blockView: false,
  showZoom: true,
  showSettings: false,
  showAttributions: false,
  toolsToggle: null,
  customStyle: null,
}
