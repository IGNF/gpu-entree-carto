import { describe, expect, it } from 'vitest'
import {
  formatScotParcelLegendTitle,
  getScotLegendImagePath,
  parseScotApprovedValue,
  resolveScotWfsDisplayState,
  scotWfsStatusBadgeLabel,
  scotWfsStatusBannerMessage,
} from '@/lib/fiche/scotWfsStatus'

describe('scotWfsStatus', () => {
  it('interprète approved false comme SCoT arrêté (périmètre)', () => {
    expect(parseScotApprovedValue(false)).toBe(false)
    expect(resolveScotWfsDisplayState({ approved: false })).toBe('stopped')
    expect(getScotLegendImagePath('scot', { approved: false })).toBe('scot/SCOT_PERIMETER.png')
  })

  it('approved absent ou null → arrêté', () => {
    expect(resolveScotWfsDisplayState({})).toBe('stopped')
    expect(resolveScotWfsDisplayState({ approved: null, gpu_id: null })).toBe('stopped')
    expect(resolveScotWfsDisplayState(undefined)).toBe('stopped')
  })

  it('interprète approved true (booléen, chaîne, 1) sans gpu_id comme non publié', () => {
    expect(resolveScotWfsDisplayState({ approved: true })).toBe('not_published')
    expect(resolveScotWfsDisplayState({ approved: 1 })).toBe('not_published')
    expect(getScotLegendImagePath('scot', { approved: 'true' })).toBe('scot/SCOT_NOT_PUBLISHED.png')
  })

  it('gpu_id renseigné → publié ; gpu_id vide → non publié', () => {
    expect(getScotLegendImagePath('scot', { gpu_id: 'abc', approved: false })).toBe(
      'scot/SCOT_PUBLISHED.png',
    )
    expect(resolveScotWfsDisplayState({ gpu_id: '  ', approved: false })).toBe('stopped')
  })

  it('expose les libellés de badge et de bandeau', () => {
    expect(scotWfsStatusBadgeLabel('not_published')).toBe('NON PUBLIÉ')
    expect(scotWfsStatusBadgeLabel('stopped')).toBe('ARRÊTÉ')
    expect(scotWfsStatusBannerMessage('not_published')).toMatch(/pas encore publié/)
    expect(scotWfsStatusBannerMessage('stopped')).toBe(
      'Ce schéma de cohérence territoriale est arrêté.',
    )
  })

  it('suffixe le titre de légende parcelle', () => {
    expect(formatScotParcelLegendTitle('SCoT test', { approved: true })).toBe(
      'SCoT test - non publié',
    )
    expect(formatScotParcelLegendTitle('SCoT test', { approved: false })).toBe('SCoT test - arrêté')
    expect(formatScotParcelLegendTitle('SCoT test', { gpu_id: 'abc' })).toBe('SCoT test')
    expect(formatScotParcelLegendTitle('', { gpu_id: 'abc' })).toBe('SCOT')
  })
})
