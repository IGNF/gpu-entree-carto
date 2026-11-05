import { afterEach, describe, expect, it } from 'vitest'
import config from '@/lib/config'
import {
  buildParcelFichePanelFootnotesHtml,
  buildParcelFichePrintFootnotesHtml,
  PARCEL_FICHE_INFORMATIVE_NOTICE,
  resolveParcelFicheFaqUrl,
} from '@/lib/fiche/ficheParcelCallouts'
import { setGpuClientConfigScriptUrl } from '@/lib/configUrls'

describe('ficheParcelCallouts', () => {
  afterEach(() => {
    delete config.faqUrl
    setGpuClientConfigScriptUrl(null)
  })

  it('inclut les deux encarts en impression sans icône DSFR', () => {
    const html = buildParcelFichePrintFootnotesHtml()
    expect(html).toContain('ec-print-fiche__footnote-callout')
    expect(html).not.toContain('ec-fiche-info__callout')
    expect(html).not.toContain('fr-icon-information-line')
    expect(html).toContain(PARCEL_FICHE_INFORMATIVE_NOTICE)
    expect(html).toContain('protégées')
    expect(html).not.toContain('FAQ')
  })

  it('affiche la phrase FAQ au panneau et le lien si faqUrl est configurée', () => {
    setGpuClientConfigScriptUrl('http://localhost:8000/map/gpu-client-config.js')
    config.faqUrl = '/faq'
    expect(resolveParcelFicheFaqUrl()).toBe('http://localhost:8000/faq')
    const html = buildParcelFichePanelFootnotesHtml()
    expect(html).toContain('Pour plus d’informations, consultez la')
    expect(html).toContain('href="http://localhost:8000/faq"')
    expect(html).toContain('>FAQ</a>')
  })

  it('affiche la phrase FAQ sans lien si faqUrl est absente', () => {
    const html = buildParcelFichePanelFootnotesHtml()
    expect(html).toContain('Pour plus d’informations, consultez la FAQ.')
    expect(html).not.toContain('<a class="fr-link"')
  })
})
