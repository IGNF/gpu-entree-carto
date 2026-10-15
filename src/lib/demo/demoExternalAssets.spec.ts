/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  demoExternalStylesheet,
  embedVendorSiblingStylesheet,
  hostPageProvidesDsfrIcons,
  hostPageProvidesRemixIcon,
  remixIconStylesheetUrl,
} from '@/lib/demo/demoExternalAssets'

describe('demoExternalAssets', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('résout une URL sous external/', () => {
    expect(demoExternalStylesheet('dsfr/dsfr.min.css')).toContain('external/dsfr/dsfr.min.css')
  })

  it('détecte utility DSFR déjà chargé par le site hôte', () => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://example.test/build/dsfr/utility/utility.main.min.css'
    document.head.appendChild(link)
    expect(hostPageProvidesDsfrIcons()).toBe(true)
  })

  it('détecte remixicon déjà chargé', () => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://example.test/vendor/remixicon/remixicon.css'
    document.head.appendChild(link)
    expect(hostPageProvidesRemixIcon()).toBe(true)
  })

  it('résout remixicon à côté du bundle vendor (gpu-site)', () => {
    const script = document.createElement('script')
    script.src = 'https://gpu.test/build/vendor/entree-carto/entree-carto.min.js?v=1'
    document.body.appendChild(script)
    expect(embedVendorSiblingStylesheet('../remixicon/remixicon.css')).toBe(
      'https://gpu.test/build/vendor/remixicon/remixicon.css',
    )
    expect(remixIconStylesheetUrl()).toContain('/build/vendor/remixicon/remixicon.css')
  })
})
