import { shallowRef } from 'vue'
import config from '@/lib/config'

/** État du chargement de `gpu-client-config.js` (démo / gpu-site). */
export type GpuClientConfigStatus = 'idle' | 'loading' | 'ready' | 'error' | 'none'

export const gpuClientConfigStatus = shallowRef<GpuClientConfigStatus>('idle')

const readyQueue: Array<() => void> = []

export function markGpuClientConfigLoading(): void {
  gpuClientConfigStatus.value = 'loading'
}

/** Pas de script config (démo sans gpu-site). */
export function markGpuClientConfigNone(): void {
  gpuClientConfigStatus.value = 'none'
  flushGpuClientConfigReadyQueue()
}

export function markGpuClientConfigReady(): void {
  gpuClientConfigStatus.value = 'ready'
  flushGpuClientConfigReadyQueue()
}

export function markGpuClientConfigError(): void {
  gpuClientConfigStatus.value = 'error'
  flushGpuClientConfigReadyQueue()
}

function flushGpuClientConfigReadyQueue(): void {
  while (readyQueue.length) {
    readyQueue.shift()?.()
  }
}

export function isGpuClientConfigSettled(): boolean {
  const s = gpuClientConfigStatus.value
  return s === 'ready' || s === 'none' || s === 'error'
}

/**
 * gpu-site : scripts Twig déjà exécutés (`LAYER_CONFIG`, `gpu.config.apiFicheInfoUrl`)
 * sans passer par `prepareDemoEnvironment` — évite de bloquer les fiches en `idle`.
 */
export function trySettleGpuClientConfigFromWindow(): void {
  if (isGpuClientConfigSettled()) return
  if (typeof window === 'undefined') return
  const w = window as Window & {
    LAYER_CONFIG?: unknown
    gpu?: { config?: Record<string, unknown> }
  }
  if (w.LAYER_CONFIG) {
    markGpuClientConfigReady()
    return
  }
  const fromGpu = w.gpu?.config?.apiFicheInfoUrl
  const fromModule = config.apiFicheInfoUrl
  const api =
    typeof fromGpu === 'string' && fromGpu.trim()
      ? fromGpu
      : typeof fromModule === 'string'
        ? fromModule
        : ''
  if (api.trim()) {
    markGpuClientConfigReady()
  }
}

/** Exécute `fn` dès que le script config est chargé (ou immédiatement si absent / déjà prêt). */
export function whenGpuClientConfigReady(fn: () => void): void {
  trySettleGpuClientConfigFromWindow()
  if (isGpuClientConfigSettled()) {
    fn()
    return
  }
  readyQueue.push(fn)
}
