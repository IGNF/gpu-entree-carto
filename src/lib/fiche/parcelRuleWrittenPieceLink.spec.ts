/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import { setGpuClientConfigScriptUrl } from '@/lib/configUrls'
import {
  resolveParcelRuleWrittenPieceHref,
  ruleWrittenPieceLinkHtml,
} from '@/lib/fiche/parcelRuleWrittenPieceLink'

describe('resolveParcelRuleWrittenPieceHref', () => {
  it('conserve l’ancre page du urlfic', () => {
    expect(
      resolveParcelRuleWrittenPieceHref({
        urlfic: 'https://example.com/reg.pdf#page=49',
      }),
    ).toBe('https://example.com/reg.pdf#page=49')
  })

  it('utilise un nomfic absolu si urlfic est absent', () => {
    expect(
      resolveParcelRuleWrittenPieceHref({
        nomfic: 'https://example.com/reg.pdf#page=12',
      }),
    ).toBe('https://example.com/reg.pdf#page=12')
  })

  describe('nom de fichier seul : API fichiers du document (apiDocumentFileUrl)', () => {
    const docId = '1cd9c54a1775550e0f77ff0e1fac59d2'
    const gpu = 'https://www.geoportail-urbanisme.gouv.fr'

    function withMainConfig() {
      setGpuClientConfigScriptUrl(`${gpu}/map/gpu-client-config.js`)
      Object.defineProperty(window, 'location', {
        value: new URL('https://ignf.github.io/gpu-entree-carto/fiche-info'),
        writable: true,
      })
      config.apiDocumentFileUrl = `${gpu}/api/document/00000000000000000000000000000000/files/__GPU_FILE_NAME__`
      config.urlPlaceholders = {
        documentId: '00000000000000000000000000000000',
        fileName: '__GPU_FILE_NAME__',
      }
    }

    afterEach(() => {
      setGpuClientConfigScriptUrl(null)
      delete config.apiDocumentFileUrl
      delete config.urlPlaceholders
    })

    it('nomfic + id du document : URL de l’API fichiers', () => {
      withMainConfig()
      expect(
        resolveParcelRuleWrittenPieceHref({ nomfic: '45340_info_surf_11_00_20180202.pdf' }, docId),
      ).toBe(`${gpu}/api/document/${docId}/files/45340_info_surf_11_00_20180202.pdf`)
    })

    it('ancre de page conservée', () => {
      withMainConfig()
      expect(
        resolveParcelRuleWrittenPieceHref(
          { nomfic: '45340_reglement_20180202.pdf#page=24' },
          docId,
        ),
      ).toBe(`${gpu}/api/document/${docId}/files/45340_reglement_20180202.pdf#page=24`)
    })

    it('urlfic prioritaire sur le nom de fichier', () => {
      withMainConfig()
      expect(
        resolveParcelRuleWrittenPieceHref(
          { urlfic: 'https://example.com/reg.pdf', nomfic: 'reg.pdf' },
          docId,
        ),
      ).toBe('https://example.com/reg.pdf')
    })

    it('SUP : nom du fichier dans `fichier`', () => {
      withMainConfig()
      const supId = 'c88982dd1ed196d51cedcd38ff1c39f0'
      expect(
        resolveParcelRuleWrittenPieceHref(
          { fichier: 'AC1_Chateau-IML8LS_20070806_act.pdf' },
          supId,
        ),
      ).toBe(`${gpu}/api/document/${supId}/files/AC1_Chateau-IML8LS_20070806_act.pdf`)
    })

    it('nomfic prioritaire sur fichier', () => {
      withMainConfig()
      expect(
        resolveParcelRuleWrittenPieceHref({ nomfic: 'reg.pdf', fichier: 'autre.pdf' }, docId),
      ).toBe(`${gpu}/api/document/${docId}/files/reg.pdf`)
    })

    it('sans id du document ou sans apiDocumentFileUrl : pas de lien', () => {
      withMainConfig()
      expect(resolveParcelRuleWrittenPieceHref({ nomfic: 'reg.pdf' })).toBe('')
      delete config.apiDocumentFileUrl
      expect(resolveParcelRuleWrittenPieceHref({ nomfic: 'reg.pdf' }, docId)).toBe('')
    })
  })
})

describe('ruleWrittenPieceLinkHtml', () => {
  it('lien DSFR bouton tertiaire sm icône PDF seule', () => {
    const html = ruleWrittenPieceLinkHtml('https://example.com/a.pdf#page=1')
    expect(html).toMatch(/<a class="[^"]*fr-btn[^"]*"/)
    expect(html).toContain('fr-btn--tertiary')
    expect(html).toContain('fr-btn--sm')
    expect(html).toContain('aria-label="Ouvrir la pièce écrite (PDF)"')
    expect(html).toContain('fr-sr-only')
    expect(html).toContain('<span class="fr-sr-only">Ouvrir la pièce écrite (PDF)</span>')
    expect(html).toContain('ri-file-pdf-2-line')
    expect(html).toContain('#page=1')
  })

  it('sans lien : pas d’icône', () => {
    expect(ruleWrittenPieceLinkHtml('')).toBe('')
  })
})
