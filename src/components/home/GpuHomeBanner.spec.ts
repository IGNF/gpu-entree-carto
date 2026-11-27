/**
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GpuHomeBanner from '@/components/home/GpuHomeBanner.vue'

describe('GpuHomeBanner — pictogrammes DSFR du bandeau', () => {
  it('fichiers SVG servis par URL (Chrome refuse les URL data: dans <use>)', () => {
    const uses = mount(GpuHomeBanner).findAll('svg.fr-artwork use')
    expect(uses).toHaveLength(12)
    for (const use of uses) {
      const href = use.attributes('href') ?? ''
      expect(href).not.toMatch(/^data:/)
      expect(href).toMatch(/\.svg(\?[^#]*)?#artwork-(decorative|minor|major)$/)
    }
  })
})
