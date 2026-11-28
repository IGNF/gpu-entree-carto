/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { LIGHT_THEME_SCOPE_CLASS, ensureLightThemeScopeStyle } from '@/lib/theme/lightThemeScope'

describe('ensureLightThemeScopeStyle', () => {
  it('redéclare en clair les variables changées par le thème sombre et celles qui en dépendent', () => {
    const dsfr = document.createElement('style')
    dsfr.textContent = `
      :root { --grey-1000-50: #fff; --background-default-grey: var(--grey-1000-50); --spacing: 1rem; }
      :root[data-fr-theme=dark] { --grey-1000-50: #161616; }
    `
    document.head.appendChild(dsfr)
    ensureLightThemeScopeStyle()
    const css = document.querySelector('style[data-ec-light-theme]')?.textContent ?? ''
    expect(css).toContain(`.${LIGHT_THEME_SCOPE_CLASS}`)
    expect(css).toContain('--grey-1000-50: #fff')
    expect(css).toContain('--background-default-grey: var(--grey-1000-50)')
    expect(css).not.toContain('--spacing')
    expect(css).not.toContain('#161616')

    ensureLightThemeScopeStyle()
    expect(document.querySelectorAll('style[data-ec-light-theme]')).toHaveLength(1)
  })
})
