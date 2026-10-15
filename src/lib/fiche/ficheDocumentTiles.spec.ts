import { describe, expect, it } from 'vitest'
import { documentUrbanismTileHtml } from '@/lib/fiche/ficheDocumentTiles'

describe('documentUrbanismTileHtml', () => {
  it('affiche uniquement PRÉVISUALISATION pour document.preview', () => {
    const html = documentUrbanismTileHtml({
      title: 'DU_62193',
      status: 'document.preview',
      effectiveStatus: 'EN_VIGUEUR',
      legalStatus: 'HISTORICAL',
    })
    expect(html).toContain('ec-fiche-info__badge--preview')
    expect(html).toContain('PRÉVISUALISATION')
    expect(html).not.toContain('ec-fiche-info__badge--vigueur')
    expect(html).not.toContain('ec-fiche-info__badge--historique')
    expect(html).not.toContain('APPROUVÉ')
  })

  it('conserve EN VIGUEUR + statut légal pour document.production', () => {
    const html = documentUrbanismTileHtml({
      title: 'DU_prod',
      status: 'document.production',
      effectiveStatus: 'EN_VIGUEUR',
      legalStatus: 'APPROVED',
    })
    expect(html).toContain('ec-fiche-info__badge--vigueur')
    expect(html).toContain('APPROUVÉ')
    expect(html).not.toContain('ec-fiche-info__badge--preview')
  })
})
