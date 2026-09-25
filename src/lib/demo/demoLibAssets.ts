import { getDemoConfig } from '@/lib/demo/demoConfig'
import type { MountedViewer } from '@/lib/mount'
import type { MountLocationSearchOptions, MountedLocationSearch } from '@/lib/mountLocationSearch'
import type { MountSearchEngineOptions, MountedSearchEngine } from '@/lib/mountSearchEngine'
import type { AutocompleteLocation, StandardViewerParams } from '@/lib/types'
import type { MountGeometryEditorHandle } from '@/geometry-editor'
import type { GeometryEditorOptions } from '@/geometry-editor/types'
import type { MountSketchHandle, MountSketchOptions } from '@/sketch/mountSketch'

/** Bundles IIFE livrés dans `dist/` (gpu-site). */
export type DemoLibBundle =
  | 'entree-carto'
  | 'entree-carto-location-search'
  | 'entree-carto-search-engine'
  | 'entree-carto-geometry-editor'
  | 'entree-carto-sketch'

export function demoUsesMinifiedAssets(cfg = getDemoConfig()): boolean {
  return cfg.useMinimified === true
}

function assetSuffix(minified: boolean): '.min' | '' {
  return minified ? '.min' : ''
}

function normalizeBaseUrl(base: string): string {
  return base.endsWith('/') ? base : `${base}/`
}

export function libBundleAssetUrls(
  bundle: DemoLibBundle,
  minified = demoUsesMinifiedAssets(),
): { js: string; css: string } {
  const suffix = assetSuffix(minified)
  const root = normalizeBaseUrl(import.meta.env.BASE_URL)
  return {
    js: `${root}dist/${bundle}${suffix}.js`,
    css: `${root}dist/css/${bundle}${suffix}.css`,
  }
}

const loadedStyles = new Set<string>()
const loadedScripts = new Set<string>()

export function loadStylesheetOnce(href: string): Promise<void> {
  if (loadedStyles.has(href)) return Promise.resolve()
  const existing = document.querySelector<HTMLLinkElement>(`link[data-ec-lib-css="${href}"]`)
  if (existing) {
    loadedStyles.add(href)
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.ecLibCss = href
    link.onload = () => {
      loadedStyles.add(href)
      resolve()
    }
    link.onerror = () => reject(new Error(`Impossible de charger la feuille de style ${href}`))
    document.head.appendChild(link)
  })
}

export function loadScriptOnce(src: string): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>(`script[data-ec-lib-js="${src}"]`)
  if (existing) {
    loadedScripts.add(src)
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.dataset.ecLibJs = src
    script.onload = () => {
      loadedScripts.add(src)
      resolve()
    }
    script.onerror = () => reject(new Error(`Impossible de charger le script ${src}`))
    document.body.appendChild(script)
  })
}

export async function loadLibBundle(
  bundle: DemoLibBundle,
  minified = demoUsesMinifiedAssets(),
): Promise<void> {
  const { js, css } = libBundleAssetUrls(bundle, minified)
  await loadStylesheetOnce(css)
  await loadScriptOnce(js)
}

type GpuMountApi = {
  createStandardViewer?: (params?: StandardViewerParams) => MountedViewer | null
  mountSearchEngine?: (
    container: HTMLElement,
    options?: MountSearchEngineOptions,
  ) => MountedSearchEngine
  mountLocationSearch?: (
    container: HTMLElement,
    options?: MountLocationSearchOptions,
  ) => MountedLocationSearch
}

type GeometryEditorBundleApi = {
  mountGeometryEditor: (
    element: HTMLElement | string,
    options?: GeometryEditorOptions,
  ) => MountGeometryEditorHandle
}

type SketchBundleApi = {
  mountSketch: (container: HTMLElement, options?: MountSketchOptions) => MountSketchHandle
}

function gpuMountApi(): GpuMountApi {
  return (window as Window & { gpu?: GpuMountApi }).gpu ?? {}
}

export function getMountSearchEngineFromBundle(): NonNullable<GpuMountApi['mountSearchEngine']> {
  const fn = gpuMountApi().mountSearchEngine
  if (!fn) {
    throw new Error(
      'mountSearchEngine introuvable (charger entree-carto-search-engine[.min].js depuis dist/)',
    )
  }
  return fn
}

export function getMountLocationSearchFromBundle(): NonNullable<
  GpuMountApi['mountLocationSearch']
> {
  const fn = gpuMountApi().mountLocationSearch
  if (!fn) {
    throw new Error(
      'mountLocationSearch introuvable (charger entree-carto-location-search[.min].js depuis dist/)',
    )
  }
  return fn
}

export function getCreateStandardViewerFromBundle(): NonNullable<
  GpuMountApi['createStandardViewer']
> {
  const fn = gpuMountApi().createStandardViewer
  if (!fn) {
    throw new Error('createStandardViewer introuvable (charger entree-carto[.min].js depuis dist/)')
  }
  return fn
}

export function getMountGeometryEditorFromBundle(): GeometryEditorBundleApi['mountGeometryEditor'] {
  const fn = (window as Window & { EntreeCartoGeometryEditor?: GeometryEditorBundleApi })
    .EntreeCartoGeometryEditor?.mountGeometryEditor
  if (!fn) {
    throw new Error(
      'mountGeometryEditor introuvable (charger entree-carto-geometry-editor[.min].js depuis dist/)',
    )
  }
  return fn
}

export function getMountSketchFromBundle(): SketchBundleApi['mountSketch'] {
  const fn = (window as Window & { EntreeCartoSketch?: SketchBundleApi }).EntreeCartoSketch
    ?.mountSketch
  if (!fn) {
    throw new Error('mountSketch introuvable (charger entree-carto-sketch[.min].js depuis dist/)')
  }
  return fn
}

export type { AutocompleteLocation }
