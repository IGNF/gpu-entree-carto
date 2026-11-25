/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import type Map from 'ol/Map'
import { placeElementInGeopfContainer } from '@/map/geopfControlPlacement'

function mapWithContainer(): { map: Map; container: HTMLElement } {
  const target = document.createElement('div')
  const container = document.createElement('div')
  container.className = 'position-container-bottom-left'
  container.id = 'position-container-bottom-left'
  target.appendChild(container)
  return { map: { getTargetElement: () => target } as unknown as Map, container }
}

describe('placeElementInGeopfContainer', () => {
  it('donne un id au format geopf (Nom-123) : PanelManager lit `id.match(/(\\w+)-[0-9]+/)[1]` de chaque enfant', () => {
    const { map, container } = mapWithContainer()
    const el = document.createElement('div')
    el.appendChild(document.createElement('button'))
    placeElementInGeopfContainer(map, el, 'bottom-left')
    expect(el.parentElement).toBe(container)
    expect(el.id.match(/(\w+)-[0-9]+/)?.[1]).toBeTruthy()
  })

  it('conserve un id existant', () => {
    const { map } = mapWithContainer()
    const el = document.createElement('div')
    el.id = 'GPsketch-42'
    placeElementInGeopfContainer(map, el, 'bottom-left')
    expect(el.id).toBe('GPsketch-42')
  })
})
