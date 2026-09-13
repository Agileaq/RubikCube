import type { Color } from '../types'

// Single source of truth for palette colors: the UI chips (Palette.tsx) and
// the scanner classifier (lib/scan/classify.ts) must agree on the 6 colors.
export const COLOR_ORDER: Color[] = ['Y', 'R', 'B', 'W', 'O', 'G']
export const COLOR_HEX: Record<Color, string> = {
  W: '#f8f8f8', Y: '#ffd500', R: '#c41e3a', O: '#ff8c00', G: '#009e60', B: '#0051ba',
}

export interface Rgb { r: number; g: number; b: number }
export interface Lab { L: number; a: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHsv({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const rf = r / 255, gf = g / 255, bf = b / 255
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === rf) h = ((gf - bf) / d + 6) % 6
    else if (max === gf) h = (bf - rf) / d + 2
    else h = (rf - gf) / d + 4
    h *= 60
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function rgbToLab({ r, g, b }: Rgb): Lab {
  const f = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
  const R = f(r), G = f(g), B = f(b)
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const g2 = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = g2(X), fy = g2(Y), fz = g2(Z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

// CIE ΔE94 (graphic-arts weights kL=kC=kH=1).
export function deltaE94(l1: Lab, l2: Lab): number {
  const dL = l1.L - l2.L
  const c1 = Math.hypot(l1.a, l1.b)
  const c2 = Math.hypot(l2.a, l2.b)
  const dC = c1 - c2
  const dA = l1.a - l2.a
  const dB = l1.b - l2.b
  const dH2 = Math.max(0, dA * dA + dB * dB - dC * dC)
  const sl = 1
  const sc = 1 + 0.045 * c1
  const sh = 1 + 0.015 * c1
  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + dH2 / (sh * sh))
}
