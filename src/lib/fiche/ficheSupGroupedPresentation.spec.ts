import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  buildEl9SupGroupHtml,
  buildGroupedSupTabHtml,
  EL9_SUP_ALERT_DETAIL,
  supCategoryLegalLinkLabel,
} from '@/lib/fiche/ficheSupGroupedPresentation'

const categoriesFixture = [
  {
    name: 'AC1',
    libelle:
      'Servitudes relatives aux monuments historiques (immeubles classés et inscrits, abords des monuments historiques)',
    urlFiche: 'https://example.com/fiche-ac1.pdf',
  },
  {
    name: 'EL9',
    libelle: 'Servitude de passage des piétons sur le littoral',
    urlFiche: 'https://example.com/fiche-el9.pdf',
  },
]

describe('supCategoryLegalLinkLabel', () => {
  it('utilise le libellé gpu-client', () => {
    expect(
      supCategoryLegalLinkLabel(
        { name: 'AC1', libelle: 'Servitudes monuments historiques' },
        'AC1',
      ),
    ).toBe('Lien vers la fiche juridique de la SUP (AC1)')
  })
})

describe('buildGroupedSupTabHtml', () => {
  beforeEach(() => {
    vi.stubGlobal('SUP_CATEGORIES', categoriesFixture)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lien juridique + tuile catégorie / détail document', () => {
    const html = buildGroupedSupTabHtml({
      p1: {
        documents: [
          {
            title: 'SUP AC1 test',
            status: 'document.production',
            typepsc: 'AC1',
            id: 'abc1234567890123456789012345678',
          },
        ],
      },
    })
    expect(html).toContain('Lien vers la fiche juridique de la SUP (AC1)')
    expect(html).toContain('fr-tile__detail')
    expect(html).toContain('Servitudes relatives aux monuments historiques')
    expect(html).toContain('<p class="fr-tile__detail">SUP AC1 test</p>')
  })

  it('ajoute le bloc EL9 en tête si is_el9_alert', () => {
    const html = buildGroupedSupTabHtml({}, { isEl9Alert: true })
    expect(html.indexOf('fiche-el9.pdf')).toBeLessThan(html.indexOf(EL9_SUP_ALERT_DETAIL))
    expect(html).toContain('Lien vers la fiche juridique de la SUP (EL9)')
    expect(html).toContain(EL9_SUP_ALERT_DETAIL)
  })
})

describe('buildEl9SupGroupHtml', () => {
  it('fonctionne sans window.SUP_CATEGORIES', () => {
    const html = buildEl9SupGroupHtml(categoriesFixture)
    expect(html).toContain('Servitude de passage des piétons sur le littoral')
    expect(html).toContain(EL9_SUP_ALERT_DETAIL)
  })
})
