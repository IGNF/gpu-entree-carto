import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  computeFicheCatalogFamilyVisibility,
  filterParcelDocumentsHtmlByCatalog,
  filterParcelInfosHtmlByCatalog,
  isFicheDocumentFamilyVisible,
  setFicheCatalogFamilyVisibility,
} from '@/lib/fiche/ficheCatalogVisibilityFilter'
import { setMapPermalinkParams } from '@/lib/map/mapPermalink'

describe('filterParcelDocumentsHtmlByCatalog', () => {
  const html = `<p class="ec-fiche-info__intro">Intro</p>
<h3 class="ec-fiche-info__section-title">Documents d’urbanisme</h3><div class="ec-fiche-info__tile-list">DU</div>
<h3 class="ec-fiche-info__section-title">Servitudes d’utilité publique</h3><div class="ec-fiche-info__tile-list">SUP</div>`

  beforeEach(() => {
    setMapPermalinkParams({ 'dev-du': '1:0.7:0:0:1', 'dev-sup': '1:0.7:0:0:1' })
  })

  afterEach(() => {
    setMapPermalinkParams({})
  })

  it('masque la section SUP si dev-sup est décoché', () => {
    setMapPermalinkParams({ 'dev-du': '1:0.7:0:0:1', 'dev-sup': '0:0.7:0:0:1' })
    const out = filterParcelDocumentsHtmlByCatalog(html)
    expect(out).toContain('Documents d’urbanisme')
    expect(out).not.toContain('Servitudes d’utilité publique')
    expect(out).not.toContain('>SUP<')
  })

  it('ne laisse que l’intro si toutes les sections visibles sont masquées', () => {
    setMapPermalinkParams({ 'dev-du': '0:0.7:0:0:1', 'dev-sup': '0:0.7:0:0:1' })
    const out = filterParcelDocumentsHtmlByCatalog(html)
    expect(out).toContain('ec-fiche-info__intro')
    expect(out).not.toContain('Aucun document visible')
    expect(out).not.toContain('Servitudes')
  })
})

describe('computeFicheCatalogFamilyVisibility', () => {
  afterEach(() => {
    setFicheCatalogFamilyVisibility(null)
    setMapPermalinkParams({})
  })

  it('masque SUP et SCoT si les entrées catalogue correspondantes sont décochées', () => {
    const entries = [
      { id: 'dev-du', path: '/dev-du', permalinkId: 'dev-du' },
      { id: 'dev-sup', path: '/dev-sup', permalinkId: 'dev-sup' },
      { id: 'dev-scot', path: '/dev-scot', permalinkId: 'dev-scot' },
    ]
    const vis = computeFicheCatalogFamilyVisibility(
      { 'dev-du': true, 'dev-sup': false, 'dev-scot': false },
      entries,
    )
    expect(vis.du).toBe(true)
    expect(vis.sup).toBe(false)
    expect(vis.scot).toBe(false)
  })

  it('setFicheCatalogFamilyVisibility prime sur le permalink', () => {
    setMapPermalinkParams({ 'dev-sup': '1:0.7:0:0:1', 'dev-scot': '1:0.7:0:0:1' })
    setFicheCatalogFamilyVisibility({
      du: true,
      psmv: true,
      sup: false,
      scot: false,
      mec: true,
    })
    expect(isFicheDocumentFamilyVisible('sup')).toBe(false)
    expect(isFicheDocumentFamilyVisible('scot')).toBe(false)
  })
})

describe('filterParcelInfosHtmlByCatalog', () => {
  it('retire la section zonage si le DU catalogue est masqué', () => {
    setMapPermalinkParams({ 'dev-du': '0:0.7:0:0:1' })
    const html = `<section class="ec-fiche-info__rules-section"><h4>Zonage(s)</h4></section>`
    expect(filterParcelInfosHtmlByCatalog(html)).toBe('')
    setMapPermalinkParams({})
  })
})
