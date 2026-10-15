/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  demoExternalStylesheet,
  hostPageProvidesDsfrIcons,
  hostPageProvidesRemixIcon,
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
})
