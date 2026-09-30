import { shallowRef } from 'vue'

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

/** Exécute `fn` dès que le script config est chargé (ou immédiatement si absent / déjà prêt). */
export function whenGpuClientConfigReady(fn: () => void): void {
  if (isGpuClientConfigSettled()) {
    fn()
    return
  }
  readyQueue.push(fn)
}
