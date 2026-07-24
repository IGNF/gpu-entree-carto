/**
 * Options alignées sur ol-geometry-editor (sous-ensemble utile + format KML).
 */
export type GeometryTypeOption =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'Rectangle'
  | 'Geometry'

export type GeometryOutputFormat = 'geojson' | 'kml'

export interface TileLayerConfig {
  url: string
  attribution?: string
  title?: string
  maxZoom?: number
}

export interface GeometryEditorOptions {
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
  >
> & { tileLayers: TileLayerConfig[] } = {
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
}
