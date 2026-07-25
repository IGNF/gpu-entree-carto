/** Utilitaires couleur rgba / hex pour le color picker croquis. */

export interface RgbaColor {
  r: number
  g: number
  b: number
  a: number
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(1, Math.max(0, n))
}

export function parseColor(value: string, fallback: RgbaColor = { r: 0, g: 0, b: 145, a: 1 }): RgbaColor {
  const v = (value || '').trim()
  if (!v || v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(v)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    }
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a: clamp01(a) }
  }
  const rgba =
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(v)
  if (rgba) {
    return {
      r: Math.round(Number(rgba[1])),
      g: Math.round(Number(rgba[2])),
      b: Math.round(Number(rgba[3])),
      a: clamp01(rgba[4] !== undefined ? Number(rgba[4]) : 1),
    }
  }
  return { ...fallback }
}

export function toRgbaString(c: RgbaColor): string {
  const a = Math.round(clamp01(c.a) * 1000) / 1000
  if (a <= 0) return 'rgba(0, 0, 0, 0)'
  if (a >= 1) return `rgb(${c.r}, ${c.g}, ${c.b})`
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`
}

export function toHexRgb(c: RgbaColor): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

export function isTransparent(value: string): boolean {
  return parseColor(value).a <= 0.001
}
