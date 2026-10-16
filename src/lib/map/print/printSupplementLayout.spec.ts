import { describe, expect, it } from 'vitest'
import { countSupplementPageSlices } from '@/lib/map/print/printSupplementLayout'

describe('countSupplementPageSlices', () => {
  it('ignore scrollHeight gonflé et retire les tranches vides', () => {
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
    const page = root.querySelector('.ec-print-supplement-page') as HTMLElement
    const item = root.querySelector('.ec-layer-legends__item') as HTMLElement

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

    Object.defineProperty(item, 'offsetHeight', { configurable: true, value: 20 })

    document.body.appendChild(root)
    try {
      expect(countSupplementPageSlices(root, 400)).toBe(3)
    } finally {
      root.remove()
    }
  })
})
