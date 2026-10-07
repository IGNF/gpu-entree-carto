import { describe, expect, it } from 'vitest'
import {
  detectMobileFixedUsesShellContainingBlock,
  mobileMapFixedOriginTopPx,
  nearestSheetSnapIndex,
  snapPercentForIndex,
} from '@/lib/map/tabPanelsLayout'

function installFixedProbeStub(shell: HTMLElement) {
  let probeViewportTop = 10
  const nativeAppend = HTMLElement.prototype.appendChild
  shell.appendChild = <T extends Node>(node: T): T => {
    const result = nativeAppend.call(shell, node) as T
    if (node instanceof HTMLElement && node.getAttribute('aria-hidden') === 'true') {
      Object.defineProperty(node, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          top: probeViewportTop,
          bottom: probeViewportTop,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
        }),
      })
    }
    return result
  }
  return {
    setProbeTop(top: number) {
      probeViewportTop = top
    },
  }
}

describe('tabPanelsLayout', () => {
  it('snapPercentForIndex', () => {
    expect(snapPercentForIndex(0)).toBe(0)
    expect(snapPercentForIndex(3)).toBe(98)
  })

  it('nearestSheetSnapIndex', () => {
    expect(nearestSheetSnapIndex(0)).toBe(0)
    expect(nearestSheetSnapIndex(34)).toBe(1)
    expect(nearestSheetSnapIndex(55)).toBe(2)
    expect(nearestSheetSnapIndex(97)).toBe(3)
  })

  it('detectMobileFixedUsesShellContainingBlock (sonde fixed)', () => {
    const shell = document.createElement('div')
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 140, bottom: 800, left: 0, right: 390, width: 390, height: 660 }),
    })
    const probe = installFixedProbeStub(shell)
    probe.setProbeTop(10)
    expect(detectMobileFixedUsesShellContainingBlock(shell)).toBe(false)
    probe.setProbeTop(150)
    expect(detectMobileFixedUsesShellContainingBlock(shell)).toBe(true)
  })

  it('mobileMapFixedOriginTopPx (viewport vs shell)', () => {
    const shell = document.createElement('div')
    shell.className = 'ec-map-shell ec-map-shell--tab-panels-layout-bottom'
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 140, bottom: 800, left: 0, right: 390, width: 390, height: 660 }),
    })
    const probe = installFixedProbeStub(shell)
    probe.setProbeTop(10)
    expect(mobileMapFixedOriginTopPx(shell)).toBe(140)
    probe.setProbeTop(150)
    expect(mobileMapFixedOriginTopPx(shell)).toBe(0)
  })
})
