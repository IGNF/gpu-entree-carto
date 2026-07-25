/**
 * Normalisation de `geometryType` : un seul type, ou plusieurs séparés par des virgules
 * (ex. `"Point,Disc"` → outils filtrés, comme Geometry).
 */
export const GEOMETRY_TYPE_NAMES = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'Rectangle',
  /** @deprecated Préférer `Disc` — encore accepté (outil Disc). */
  'Circle',
  'Disc',
  /** @deprecated Préférer `MultiDisc` — encore accepté (outil Disc). */
  'MultiCircle',
  'MultiDisc',
  'Geometry',
] as const

export type GeometryTypeName = (typeof GEOMETRY_TYPE_NAMES)[number]

/**
 * Outils croquis prévus (carte principale / gpu-client DrawBar) — pas encore
 * branchés dans DrawToolsBar. Réservés pour la roadmap TODO_LIST.
 */
export const FUTURE_GEOMETRY_TOOL_NAMES = [
  'Text',
  'Import',
  'Export',
  'MeasureDistance',
  'MeasureArea',
] as const

export type FutureGeometryToolName = (typeof FUTURE_GEOMETRY_TOOL_NAMES)[number]

const KNOWN = new Set<string>(GEOMETRY_TYPE_NAMES)

/** Types dessinables « simples » (outil unique, remplace la géométrie). */
const REPLACE_ON_DRAW = new Set<GeometryTypeName>([
  'Point',
  'LineString',
  'Polygon',
  'Rectangle',
  'Circle',
  'Disc',
])

export function isGeometryTypeName(value: string): value is GeometryTypeName {
  return KNOWN.has(value)
}

/**
 * Découpe `geometryType` en liste de types connus.
 * `"Geometry"` seul → tous les outils libres (Point, Line, Polygon, Disc).
 * CSV inconnu filtré ; vide → `['Geometry']`.
 */
export function parseGeometryTypes(
  geometryType: string | undefined | null,
): GeometryTypeName[] {
  const raw = String(geometryType ?? 'Geometry')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const names = raw.filter(isGeometryTypeName)
  if (!names.length) return ['Geometry']
  return names
}

/** Plusieurs types ou mode Geometry → barre multi-outils. */
export function isMultiToolMode(types: GeometryTypeName[]): boolean {
  if (types.length > 1) return true
  return types[0] === 'Geometry'
}

/** Remplacer la feature au prochain dessin (type simple unique). */
export function shouldReplaceOnDraw(types: GeometryTypeName[]): boolean {
  return types.length === 1 && REPLACE_ON_DRAW.has(types[0])
}

/** Type « primaire » pour sérialisation Multi* / Rectangle / Disc dédiés. */
export function primaryGeometryType(
  types: GeometryTypeName[],
): GeometryTypeName {
  if (types.length === 1) return types[0]
  return 'Geometry'
}

/**
 * Types d’outils de dessin à afficher (sans modify/remove).
 * Plus d’outil « Circle » : Circle / MultiCircle exposent l’outil Disc (compat).
 */
export function drawToolKeys(types: GeometryTypeName[]): Array<
  'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Disc'
> {
  const keys = new Set<
    'Point' | 'LineString' | 'Polygon' | 'Rectangle' | 'Disc'
  >()

  const addFrom = (t: GeometryTypeName): void => {
    if (t === 'Geometry') {
      keys.add('Point')
      keys.add('LineString')
      keys.add('Polygon')
      keys.add('Disc')
      return
    }
    if (t === 'Point' || t === 'MultiPoint') keys.add('Point')
    else if (t === 'LineString' || t === 'MultiLineString') keys.add('LineString')
    else if (t === 'Polygon' || t === 'MultiPolygon') keys.add('Polygon')
    else if (t === 'Rectangle') keys.add('Rectangle')
    else if (
      t === 'Disc' ||
      t === 'MultiDisc' ||
      t === 'Circle' ||
      t === 'MultiCircle'
    ) {
      keys.add('Disc')
    }
  }

  for (const t of types) addFrom(t)
  return [...keys]
}
