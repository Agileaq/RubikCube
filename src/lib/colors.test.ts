import { describe, it, expect } from 'vitest'
import { hexToRgb, rgbToHsv, rgbToLab, deltaE94, deltaE2000, COLOR_HEX } from './colors'

describe('colors', () => {
  it('hexToRgb parses palette hexes', () => {
    expect(hexToRgb('#ff8c00')).toEqual({ r: 255, g: 140, b: 0 })
    expect(hexToRgb('#f8f8f8')).toEqual({ r: 248, g: 248, b: 248 })
  })
  it('rgbToHsv: pure yellow is saturated and bright', () => {
    const { s, v } = rgbToHsv({ r: 255, g: 213, b: 0 })
    expect(s).toBeCloseTo(1, 5)
    expect(v).toBeCloseTo(1, 5)
  })
  it('rgbToHsv: gray has zero saturation', () => {
    expect(rgbToHsv({ r: 128, g: 128, b: 128 }).s).toBe(0)
  })
  it('rgbToLab: white ≈ L=100, a≈0, b≈0', () => {
    const { L, a, b } = rgbToLab({ r: 255, g: 255, b: 255 })
    expect(L).toBeCloseTo(100, 1)
    expect(Math.abs(a)).toBeLessThan(0.5)
    expect(Math.abs(b)).toBeLessThan(0.5)
  })
  it('deltaE94: identical colors are 0, yellow/orange clearly differ', () => {
    const lab = rgbToLab({ r: 255, g: 213, b: 0 })
    expect(deltaE94(lab, lab)).toBe(0)
    expect(deltaE94(rgbToLab({ r: 255, g: 213, b: 0 }), rgbToLab({ r: 255, g: 140, b: 0 }))).toBeGreaterThan(5)
  })
  it('deltaE2000: identical is 0; vivid green is nearer palette G than W (真机绿贴纸回归)', () => {
    const lab = rgbToLab({ r: 0, g: 233, b: 0 })
    expect(deltaE2000(lab, lab)).toBe(0)
    const dG = deltaE2000(lab, rgbToLab(hexToRgb(COLOR_HEX.G)))
    const dW = deltaE2000(lab, rgbToLab(hexToRgb(COLOR_HEX.W)))
    expect(dG).toBeLessThan(dW)
  })
  it('deltaE2000: matches Sharma reference pairs', () => {
    const p1 = { L: 50, a: 2.6772, b: -79.7751 }
    const p2 = { L: 50, a: 0, b: -82.7485 }
    expect(deltaE2000(p1, p2)).toBeCloseTo(2.0425, 3)
    expect(deltaE2000({ L: 50, a: 3.1571, b: -77.2803 }, p2)).toBeCloseTo(2.8615, 3)
    expect(deltaE2000({ L: 50, a: 2.8361, b: -74.02 }, p2)).toBeCloseTo(3.4412, 3)
  })
  it('palette hex table has all 6 colors', () => {
    expect(Object.keys(COLOR_HEX).sort()).toEqual(['B', 'G', 'O', 'R', 'W', 'Y'])
  })
})
