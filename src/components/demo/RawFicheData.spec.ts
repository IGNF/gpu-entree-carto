/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RawFicheData from '@/components/demo/RawFicheData.vue'

const response = JSON.parse(readFileSync('src/test/fixtures/fiche-info/salvetat.json', 'utf8'))
const raw = { ...response, lon: 1.27, lat: 43.57, mode: 'territoire', source: 'gpu-fiche-info-api' }

function topLevelNode(wrapper: ReturnType<typeof mount>, key: string) {
  return wrapper
    .findAll('.ec-raw-fiche__tree > .ec-raw-node')
    .find((li) => li.find('.ec-raw-node__key').text() === key)
}

describe('RawFicheData', () => {
  it('fiche territoire : champ non lu grisé, conteneur partiellement lu non grisé, clés client à part', () => {
    const wrapper = mount(RawFicheData, { props: { raw, mode: 'territory' } })
    expect(topLevelNode(wrapper, 'el9Included')?.classes()).toContain('ec-raw-node--unused')
    expect(topLevelNode(wrapper, 'grid')?.classes()).toContain('ec-raw-node--partial')
    expect(topLevelNode(wrapper, 'typeref')?.classes()).toContain('ec-raw-node--used')
    expect(topLevelNode(wrapper, 'source')).toBeUndefined()
    expect(wrapper.find('.ec-raw-fiche__client').text()).toContain('source = gpu-fiche-info-api')
  })

  it('sans réponse : message d’attente', () => {
    const wrapper = mount(RawFicheData, { props: { raw: null, mode: 'parcel' } })
    expect(wrapper.text()).toContain('Cliquez sur la carte')
  })
})
