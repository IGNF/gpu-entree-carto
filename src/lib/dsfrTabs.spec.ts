/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { discloseDsfrTabPanel } from '@/lib/dsfrTabs'

afterEach(() => {
  delete (window as { dsfr?: unknown }).dsfr
})

describe('discloseDsfrTabPanel', () => {
  it('JS DSFR présent, panneau masqué par DSFR : le réaffiche', () => {
    const disclose = vi.fn()
    ;(window as { dsfr?: unknown }).dsfr = () => ({ tabPanel: { isDisclosed: false, disclose } })
    discloseDsfrTabPanel(document.createElement('div'))
    expect(disclose).toHaveBeenCalledTimes(1)
  })

  it('panneau déjà affiché : rien à faire', () => {
    const disclose = vi.fn()
    ;(window as { dsfr?: unknown }).dsfr = () => ({ tabPanel: { isDisclosed: true, disclose } })
    discloseDsfrTabPanel(document.createElement('div'))
    expect(disclose).not.toHaveBeenCalled()
  })

  it('sans JS DSFR ou panneau pas encore initialisé : sans effet', () => {
    expect(() => discloseDsfrTabPanel(document.createElement('div'))).not.toThrow()
    ;(window as { dsfr?: unknown }).dsfr = () => ({})
    expect(() => discloseDsfrTabPanel(document.createElement('div'))).not.toThrow()
    expect(() => discloseDsfrTabPanel(null)).not.toThrow()
  })
})
