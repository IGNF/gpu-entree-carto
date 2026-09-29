import { describe, expect, it } from 'vitest'
import {
  isMunicipalArrondissementInsee,
  parentCommuneInseeForArrondissement,
} from '@/lib/map/municipalArrondissement'

describe('municipalArrondissement', () => {
  it('associe Paris arrondissements à 75056', () => {
    expect(parentCommuneInseeForArrondissement('75104')).toBe('75056')
    expect(isMunicipalArrondissementInsee('75104')).toBe(true)
    expect(parentCommuneInseeForArrondissement('75056')).toBeNull()
  })

  it('associe Lyon arrondissements à 69123', () => {
    expect(parentCommuneInseeForArrondissement('69382')).toBe('69123')
  })

  it('associe Marseille arrondissements à 13055', () => {
    expect(parentCommuneInseeForArrondissement('13202')).toBe('13055')
  })

  it('ignore les communes ordinaires', () => {
    expect(parentCommuneInseeForArrondissement('35238')).toBeNull()
  })
})
