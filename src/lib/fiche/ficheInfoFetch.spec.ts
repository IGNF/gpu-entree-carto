import { afterEach, describe, expect, it, vi } from 'vitest'
import config from '@/lib/config'
import { MAP_MODE_TERRITORY } from '@/lib/map/mapMode'
import { abortInflightFicheInfoFetch, fetchGpuFicheInfoPayload } from '@/lib/fiche/ficheInfoFetch'

const payload = {
  title: 'test',
  grid: {},
}

function fetchInputToUrl(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url
  return ''
}

describe('fetchGpuFicheInfoPayload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl
  })

  it('ne coupe pas le fetch panneau quand un fetch emprise (background) démarre après', async () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2/territoire'

    let panelResolve: (value: Response) => void = () => {}
    const panelDeferred = new Promise<Response>((resolve) => {
      panelResolve = resolve
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = fetchInputToUrl(input)
      if (url.includes('zoom=6')) {
        const signal = init?.signal
        await new Promise<void>((resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          void panelDeferred.then(() => resolve(), reject)
        })
        return new Response(JSON.stringify(payload), { status: 200 })
      }
      return new Response(JSON.stringify(payload), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const panelPromise = fetchGpuFicheInfoPayload({
      lon: 2.35,
      lat: 48.85,
      zoom: 6,
      mode: MAP_MODE_TERRITORY,
    })

    await Promise.resolve()

    const backgroundPromise = fetchGpuFicheInfoPayload({
      lon: 2.35,
      lat: 48.85,
      zoom: 15,
      mode: MAP_MODE_TERRITORY,
      fetchRole: 'background',
    })

    panelResolve(new Response(JSON.stringify(payload), { status: 200 }))

    const [panel, background] = await Promise.all([panelPromise, backgroundPromise])
    expect(panel).toEqual(expect.objectContaining({ title: 'test' }))
    expect(background).toEqual(expect.objectContaining({ title: 'test' }))
    expect(fetchMock).toHaveBeenCalled()
  })

  it('annule aussi les fetches emprise (background) au clic suivant', async () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2/territoire'
    ;(config as { apiFicheInfoCombinedUrl?: string }).apiFicheInfoCombinedUrl = '/api/fiche-info-v2'

    let resolveBackground: () => void = () => {}
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        resolveBackground = resolve
      })
      return new Response(JSON.stringify(payload), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const backgroundPromise = fetchGpuFicheInfoPayload({
      lon: 2.35,
      lat: 48.85,
      zoom: 6,
      mode: MAP_MODE_TERRITORY,
      fetchRole: 'background',
    })
    await Promise.resolve()
    abortInflightFicheInfoFetch()
    resolveBackground()
    await expect(backgroundPromise).resolves.toBeNull()
  })

  it('envoie supersede=true au gpu-site quand un fetch panneau est interrompu', async () => {
    ;(config as { apiFicheInfoUrl?: string }).apiFicheInfoUrl = '/api/fiche-info-v2'

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = fetchInputToUrl(input)
      if (url.includes('supersede=true')) {
        return new Response(null, { status: 204 })
      }
      await new Promise(() => {})
      return new Response(JSON.stringify(payload), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    void fetchGpuFicheInfoPayload({
      lon: 2.35,
      lat: 48.85,
      zoom: 6,
      mode: MAP_MODE_TERRITORY,
    })

    await Promise.resolve()
    abortInflightFicheInfoFetch()
    await Promise.resolve()

    expect(
      fetchMock.mock.calls.some((call) => fetchInputToUrl(call[0]).includes('supersede=true')),
    ).toBe(true)
  })
})
