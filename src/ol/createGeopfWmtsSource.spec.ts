import { describe, expect, it } from 'vitest'
import View from 'ol/View'
import type WMTS from 'ol/source/WMTS'
import { get as getProjection } from 'ol/proj'
import { createGeopfWmtsSource, geopfWmtsPrintSource } from '@/ol/createGeopfWmtsSource'

const view = new View({ projection: 'EPSG:3857' })
/** Un point en France (Toulouse, EPSG:3857). */
const POINT = [160000, 5400000]

/** Paramètres GetTile demandés pour `POINT` au zoom de vue `zoom`. */
function tileRequest(source: WMTS, zoom: number): URLSearchParams {
  const grid = source.getTileGrid()!
  const z = grid.getZForResolution(view.getResolutionForZoom(zoom), source.zDirection)
  const coord = grid.getTileCoordForCoordAndZ(POINT, z)
  const url = source.getTileUrlFunction()(coord, 1, getProjection('EPSG:3857')!)
  // OpenLayers mélange les casses (`tilematrixset`, `TileMatrix`) : clés normalisées
  const params = new URLSearchParams()
  new URL(url!).searchParams.forEach((value, key) => params.set(key.toUpperCase(), value))
  return params
}

describe('createGeopfWmtsSource', () => {
  it('même niveau de tuiles que le zoom de vue, TileMatrixSet déclaré par la couche', () => {
    const source = createGeopfWmtsSource({ layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' })
    expect(source.getTileGrid()!.getTileSize(0)).toEqual([256, 256])
    for (const zoom of [6, 14, 19]) {
      const params = tileRequest(source, zoom)
      expect(params.get('TILEMATRIX')).toBe(String(zoom))
      expect(params.get('TILEMATRIXSET')).toBe('PM_0_19')
    }
  })

  it('hors des niveaux de la couche : niveau le plus proche, jamais de matrice absente', () => {
    const names = createGeopfWmtsSource({ layer: 'GEOGRAPHICALNAMES.NAMES' })
    expect(tileRequest(names, 19).get('TILEMATRIX')).toBe('18')
    expect(tileRequest(names, 5).get('TILEMATRIX')).toBe('6')
    const limits = createGeopfWmtsSource({ layer: 'LIMITES_ADMINISTRATIVES_EXPRESS.LATEST' })
    expect(tileRequest(limits, 18).get('TILEMATRIX')).toBe('16')
    expect(tileRequest(limits, 18).get('TILEMATRIXSET')).toBe('PM_6_16')
  })

  it('impression : grille 512 px (niveau inférieur agrandi 2×), variante réutilisée', () => {
    const source = createGeopfWmtsSource({ layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' })
    const print = geopfWmtsPrintSource(source)!
    expect(print.getTileGrid()!.getTileSize(0)).toEqual([512, 512])
    expect(tileRequest(print, 14).get('TILEMATRIX')).toBe('13')
    expect(geopfWmtsPrintSource(source)).toBe(print)
    expect(geopfWmtsPrintSource(print)).toBeNull()
  })
})
