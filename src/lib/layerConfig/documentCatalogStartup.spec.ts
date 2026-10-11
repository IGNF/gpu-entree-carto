import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  captureInitialLayerPermalinkFromLocation,
  initialHashHadLayerPermalinkParams,
  resetLayerPermalinkBootCaptureForTests,
} from '@/lib/layerConfig/documentCatalogStartup'

describe('documentCatalogStartup', () => {
  beforeEach(() => {
    resetLayerPermalinkBootCaptureForTests()
    window.location.hash = ''
  })

  afterEach(() => {
    window.location.hash = ''
  })

  it('hash sans couche au boot → false', () => {
    window.location.hash = '#lon=1&lat=2&z=10'
    captureInitialLayerPermalinkFromLocation()
    expect(initialHashHadLayerPermalinkParams()).toBe(false)
  })

  it('hash avec dev-scot au boot → true', () => {
    window.location.hash = '#lon=1&dev-scot=1%3A0.8%3A0%3A0%3A1'
    captureInitialLayerPermalinkFromLocation()
    expect(initialHashHadLayerPermalinkParams()).toBe(true)
  })
})
