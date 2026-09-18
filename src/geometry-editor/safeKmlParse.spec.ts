import { describe, expect, it } from 'vitest'
import {
  assertSafeKmlXmlText,
  looksLikeKmlDocument,
  parseUserKmlDocument,
} from './safeKmlParse'
import { parseRawToFeatures } from './parseGeometry'

const MINIMAL_KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <Point><coordinates>2.35,48.85,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`

describe('safeKmlParse', () => {
  it('accepte un KML minimal valide', () => {
    expect(looksLikeKmlDocument(MINIMAL_KML)).toBe(true)
    const doc = parseUserKmlDocument(MINIMAL_KML)
    expect(doc.documentElement.localName.toLowerCase()).toBe('kml')
  })

  it('rejette script et handlers', () => {
    const evil = `<kml><script>alert(1)</script></kml>`
    expect(looksLikeKmlDocument(evil)).toBe(false)
    expect(() => assertSafeKmlXmlText(evil)).toThrow()
    expect(() => parseUserKmlDocument(evil)).toThrow()
  })

  it('parseRawToFeatures ignore un KML dangereux', () => {
    const features = parseRawToFeatures(`<kml onload="x()"><Document></Document></kml>`)
    expect(features).toEqual([])
  })

  it('parseRawToFeatures lit un KML valide', () => {
    const features = parseRawToFeatures(MINIMAL_KML)
    expect(features.length).toBeGreaterThan(0)
  })
})
