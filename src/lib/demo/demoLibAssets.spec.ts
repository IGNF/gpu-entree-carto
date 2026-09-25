import { afterEach, describe, expect, it } from 'vitest'
import { demoUsesMinifiedAssets, libBundleAssetUrls } from '@/lib/demo/demoLibAssets'

describe('demoLibAssets', () => {
  const prev = globalThis.window?.DEMO_CONFIG

  afterEach(() => {
    if (prev === undefined) {
      delete (window as Window & { DEMO_CONFIG?: unknown }).DEMO_CONFIG
    } else {
      window.DEMO_CONFIG = prev
    }
  })

  it('useMinimified false par défaut', () => {
    delete (window as Window & { DEMO_CONFIG?: unknown }).DEMO_CONFIG
    expect(demoUsesMinifiedAssets()).toBe(false)
  })

  it('libBundleAssetUrls sans suffixe .min par défaut', () => {
    delete (window as Window & { DEMO_CONFIG?: unknown }).DEMO_CONFIG
    const urls = libBundleAssetUrls('entree-carto-search-engine')
    expect(urls.js).toMatch(/entree-carto-search-engine\.js$/)
    expect(urls.css).toMatch(/entree-carto-search-engine\.css$/)
  })

  it('libBundleAssetUrls avec .min si useMinimified', () => {
    window.DEMO_CONFIG = { useMinimified: true }
    const urls = libBundleAssetUrls('entree-carto-location-search')
    expect(urls.js).toContain('entree-carto-location-search.min.js')
    expect(urls.css).toContain('entree-carto-location-search.min.css')
  })
})
