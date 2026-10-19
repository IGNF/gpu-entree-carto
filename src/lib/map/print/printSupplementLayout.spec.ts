import { describe, expect, it } from 'vitest'
import {
  buildUniformSupplementSlicePlan,
  computeSupplementSlicePlan,
  countSupplementPageSlices,
  hideSupplementElementsForSlice,
  hideSupplementElementsSplitAtSliceBottom,
  measureSupplementSlicePlan,
  measureSupplementSlicePlanFromPage,
  resolveSupplementSliceEndPx,
  sanitizeSupplementSliceStarts,
} from '@/lib/map/print/printSupplementLayout'

describe('countSupplementPageSlices', () => {
  it('retourne la dernière tranche contenant un repère visible', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="print-supplement-measure__viewport">
        <div class="print-supplement-measure__content" style="width: 400px;">
          <article class="ec-print-supplement-page" style="width: 400px; height: 2000px;">
            <h2 class="ec-print-legends__title">Légendes</h2>
            <li class="ec-layer-legends__item" style="display:block;height:20px;margin-top:900px;"></li>
          </article>
        </div>
      </div>
    `
    const content = root.querySelector('.print-supplement-measure__content') as HTMLElement
    const page = root.querySelector('.ec-print-supplement-page') as HTMLElement
    const title = root.querySelector('.ec-print-legends__title') as HTMLElement
    const item = root.querySelector('.ec-layer-legends__item') as HTMLElement

    Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 2000 })

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 2000,
      left: 0,
      right: 400,
      width: 400,
      height: 2000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    title.getBoundingClientRect = () => ({
      top: 0,
      bottom: 24,
      left: 0,
      right: 400,
      width: 400,
      height: 24,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    item.getBoundingClientRect = () => ({
      top: 920,
      bottom: 940,
      left: 0,
      right: 200,
      width: 200,
      height: 20,
      x: 0,
      y: 920,
      toJSON: () => ({}),
    })

    Object.defineProperty(title, 'offsetHeight', { configurable: true, value: 24 })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 20 })

    document.body.appendChild(root)
    try {
      expect(countSupplementPageSlices(root, 400)).toBe(3)
    } finally {
      root.remove()
    }
  })

  it('remonte la fin de tranche avant une ligne légende', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page ec-print-legends'
    const item = document.createElement('li')
    item.className = 'ec-layer-legends__item'
    page.appendChild(item)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 500,
      left: 0,
      right: 400,
      width: 400,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    item.getBoundingClientRect = () => ({
      top: 360,
      bottom: 420,
      left: 0,
      right: 200,
      width: 200,
      height: 60,
      x: 0,
      y: 360,
      toJSON: () => ({}),
    })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 60 })

    expect(resolveSupplementSliceEndPx(page, 0, 400)).toBe(360)
  })

  it('évite de couper un repère entre deux tranches', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page'
    page.style.width = '400px'
    const item = document.createElement('li')
    item.className = 'ec-layer-legends__item'
    page.appendChild(item)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 500,
      left: 0,
      right: 400,
      width: 400,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    item.getBoundingClientRect = () => ({
      top: 360,
      bottom: 420,
      left: 0,
      right: 200,
      width: 200,
      height: 60,
      x: 0,
      y: 360,
      toJSON: () => ({}),
    })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 60 })
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 500 })

    const pageHeightPx = 400
    const plan = computeSupplementSlicePlan(page, pageHeightPx)
    expect(plan.sliceCount).toBe(2)
    expect(plan.sliceStarts).toEqual([0, 360])
  })

  it('ne crée pas une page de plus si un bloc tient en bas de feuille (tuile fiche)', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page ec-print-fiche'
    const tile = document.createElement('div')
    tile.className = 'ec-fiche-info__tile'
    page.appendChild(tile)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    tile.getBoundingClientRect = () => ({
      top: 385,
      bottom: 398,
      left: 0,
      right: 400,
      width: 400,
      height: 13,
      x: 0,
      y: 385,
      toJSON: () => ({}),
    })
    Object.defineProperty(tile, 'offsetHeight', { configurable: true, value: 13 })
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 398 })

    expect(computeSupplementSlicePlan(page, 400).sliceCount).toBe(1)
  })

  it('supprime les tranches quasi vides', () => {
    expect(sanitizeSupplementSliceStarts([0, 800, 805, 1600], 400)).toEqual([0, 800, 1600])
  })

  it('fiche parcelle : ne pagine pas sur un scrollHeight HTML gonflé', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page ec-print-fiche'
    page.innerHTML = `
      <div class="ec-fiche-info__body">
        <div class="ec-fiche-info__tile"></div>
      </div>
    `
    const tile = page.querySelector('.ec-fiche-info__tile') as HTMLElement
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 20_000 })
    Object.defineProperty(page, 'offsetHeight', { configurable: true, value: 20_000 })
    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 520,
      left: 0,
      right: 400,
      width: 400,
      height: 520,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    tile.getBoundingClientRect = () => ({
      top: 40,
      bottom: 520,
      left: 0,
      right: 400,
      width: 400,
      height: 480,
      x: 0,
      y: 40,
      toJSON: () => ({}),
    })
    Object.defineProperty(tile, 'offsetHeight', { configurable: true, value: 480 })

    expect(measureSupplementSlicePlanFromPage(page, 400).sliceCount).toBe(2)
    expect(measureSupplementSlicePlanFromPage(page, 400).sliceCount).toBeLessThan(10)
  })

  it('mesure les légendes sur la hauteur scroll du bloc de mesure', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="print-supplement-measure__viewport">
        <div class="print-supplement-measure__content">
          <article class="ec-print-supplement-page ec-print-legends">
            <h2 class="ec-print-legends__title">Légendes</h2>
            <li class="ec-layer-legends__item"></li>
          </article>
        </div>
      </div>
    `
    const content = root.querySelector('.print-supplement-measure__content') as HTMLElement
    const page = root.querySelector('.ec-print-supplement-page') as HTMLElement
    const item = root.querySelector('.ec-layer-legends__item') as HTMLElement

    Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 2500 })
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 2500 })

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    item.getBoundingClientRect = () => ({
      top: 40,
      bottom: 70,
      left: 0,
      right: 200,
      width: 200,
      height: 30,
      x: 0,
      y: 40,
      toJSON: () => ({}),
    })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 30 })

    document.body.appendChild(root)
    try {
      expect(measureSupplementSlicePlan(root, 400).sliceCount).toBeGreaterThan(1)
      expect(buildUniformSupplementSlicePlan(2500, 400).sliceCount).toBe(7)
    } finally {
      root.remove()
    }
  })

  it('utilise scrollHeight pour paginer les légendes', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page ec-print-legends'
    const item = document.createElement('li')
    item.className = 'ec-layer-legends__item'
    page.appendChild(item)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 900,
      left: 0,
      right: 400,
      width: 400,
      height: 900,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    item.getBoundingClientRect = () => ({
      top: 50,
      bottom: 80,
      left: 0,
      right: 200,
      width: 200,
      height: 30,
      x: 0,
      y: 50,
      toJSON: () => ({}),
    })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(page, 'scrollHeight', { configurable: true, value: 850 })

    expect(computeSupplementSlicePlan(page, 400).sliceCount).toBe(3)
  })

  it('regroupe les items légende sur deux colonnes en lignes indivisibles', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page ec-print-legends'
    page.innerHTML = `
      <section class="ec-print-legends__group">
        <h3 class="ec-print-legends__group-title">Couche</h3>
        <ul class="ec-layer-legends__list">
          <li class="ec-layer-legends__item"></li>
          <li class="ec-layer-legends__item"></li>
        </ul>
      </section>
    `
    const left = page.querySelectorAll('.ec-layer-legends__item')[0] as HTMLElement
    const right = page.querySelectorAll('.ec-layer-legends__item')[1] as HTMLElement

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 200,
      left: 0,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    left.getBoundingClientRect = () => ({
      top: 100,
      bottom: 130,
      left: 0,
      right: 180,
      width: 180,
      height: 30,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })
    right.getBoundingClientRect = () => ({
      top: 102,
      bottom: 132,
      left: 200,
      right: 380,
      width: 180,
      height: 30,
      x: 200,
      y: 102,
      toJSON: () => ({}),
    })
    Object.defineProperty(left, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(right, 'offsetHeight', { configurable: true, value: 30 })

    const pageHeightPx = 80
    const plan = computeSupplementSlicePlan(page, pageHeightPx)
    expect(plan.sliceCount).toBe(2)
    expect(plan.sliceStarts[1]).toBeLessThanOrEqual(100)
  })

  it('masque les repères coupés en bas de tranche', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page'
    const item = document.createElement('li')
    item.className = 'ec-layer-legends__item'
    page.appendChild(item)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 200,
      left: 0,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    item.getBoundingClientRect = () => ({
      top: 70,
      bottom: 110,
      left: 0,
      right: 200,
      width: 200,
      height: 40,
      x: 0,
      y: 70,
      toJSON: () => ({}),
    })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 40 })

    hideSupplementElementsSplitAtSliceBottom(page, 0, 90)
    expect(item.style.visibility).toBe('hidden')
  })

  it('masque les repères coupés quand la page est dans un transform scale (aperçu)', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page'
    const item = document.createElement('li')
    item.className = 'ec-layer-legends__item'
    page.appendChild(item)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 60,
      left: 0,
      right: 400,
      width: 400,
      height: 60,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    item.getBoundingClientRect = () => ({
      top: 21,
      bottom: 33,
      left: 0,
      right: 200,
      width: 200,
      height: 12,
      x: 0,
      y: 21,
      toJSON: () => ({}),
    })
    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 40 })

    hideSupplementElementsSplitAtSliceBottom(page, 0, 90, 0.3)
    expect(item.style.visibility).toBe('hidden')
  })

  it('masque les repères réservés à la tranche suivante (coupure remontée)', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page'
    const kept = document.createElement('li')
    kept.className = 'ec-layer-legends__item'
    const nextSlice = document.createElement('li')
    nextSlice.className = 'ec-layer-legends__item'
    page.appendChild(kept)
    page.appendChild(nextSlice)

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 200,
      left: 0,
      right: 400,
      width: 400,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    kept.getBoundingClientRect = () => ({
      top: 300,
      bottom: 330,
      left: 0,
      right: 200,
      width: 200,
      height: 30,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    })
    nextSlice.getBoundingClientRect = () => ({
      top: 360,
      bottom: 390,
      left: 0,
      right: 200,
      width: 200,
      height: 30,
      x: 0,
      y: 360,
      toJSON: () => ({}),
    })
    Object.defineProperty(kept, 'offsetHeight', { configurable: true, value: 30 })
    Object.defineProperty(nextSlice, 'offsetHeight', { configurable: true, value: 30 })

    hideSupplementElementsForSlice(page, 0, 360)
    expect(kept.style.visibility).toBe('')
    expect(nextSlice.style.visibility).toBe('hidden')
  })

  it('ne masque pas le conteneur ec-fiche-info__body entier sur une tranche', () => {
    const page = document.createElement('article')
    page.className = 'ec-print-supplement-page ec-print-fiche'
    page.innerHTML = `
      <div class="ec-fiche-info__body">
        <div class="ec-fiche-info__tile"></div>
        <div class="ec-fiche-info__tile"></div>
      </div>
    `
    const body = page.querySelector('.ec-fiche-info__body') as HTMLElement
    const firstTile = page.querySelectorAll('.ec-fiche-info__tile')[0] as HTMLElement
    const secondTile = page.querySelectorAll('.ec-fiche-info__tile')[1] as HTMLElement

    page.getBoundingClientRect = () => ({
      top: 0,
      bottom: 900,
      left: 0,
      right: 400,
      width: 400,
      height: 900,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    body.getBoundingClientRect = () => ({
      top: 0,
      bottom: 900,
      left: 0,
      right: 400,
      width: 400,
      height: 900,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    firstTile.getBoundingClientRect = () => ({
      top: 40,
      bottom: 120,
      left: 0,
      right: 400,
      width: 400,
      height: 80,
      x: 0,
      y: 40,
      toJSON: () => ({}),
    })
    secondTile.getBoundingClientRect = () => ({
      top: 420,
      bottom: 520,
      left: 0,
      right: 400,
      width: 400,
      height: 100,
      x: 0,
      y: 420,
      toJSON: () => ({}),
    })
    Object.defineProperty(body, 'offsetHeight', { configurable: true, value: 900 })
    Object.defineProperty(firstTile, 'offsetHeight', { configurable: true, value: 80 })
    Object.defineProperty(secondTile, 'offsetHeight', { configurable: true, value: 100 })

    hideSupplementElementsForSlice(page, 0, 400)
    expect(body.style.visibility).toBe('')
    expect(firstTile.style.visibility).toBe('')
    expect(secondTile.style.visibility).toBe('hidden')
  })
})
