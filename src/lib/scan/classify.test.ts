import { describe, it, expect } from 'vitest'
import { classifyPatch } from './classify'
import type { Rgb } from '../colors'

const many = (rgb: Rgb, n = 64): Rgb[] => Array.from({ length: n }, () => rgb)

describe('classifyPatch', () => {
  it('white daylight sticker → W via the white pre-rule (high confidence)', () => {
    const r = classifyPatch(many({ r: 245, g: 245, b: 245 }))
    expect(r.color).toBe('W')
    expect(r.low).toBe(false)
  })
  it('warm desaturated white → W but flagged low (rule margin thin)', () => {
    const r = classifyPatch(many({ r: 255, g: 238, b: 214 }))
    expect(r.color).toBe('W')
    expect(r.low).toBe(true)
  })
  it('strong yellow never leaks into the white rule', () => {
    expect(classifyPatch(many({ r: 255, g: 213, b: 0 })).color).toBe('Y')
  })
  it('palette-like samples classify to their own colors', () => {
    expect(classifyPatch(many({ r: 196, g: 30, b: 58 })).color).toBe('R')
    expect(classifyPatch(many({ r: 255, g: 140, b: 0 })).color).toBe('O')
    expect(classifyPatch(many({ r: 0, g: 158, b: 96 })).color).toBe('G')
    expect(classifyPatch(many({ r: 0, g: 81, b: 186 })).color).toBe('B')
  })
  it('borderline red/orange is flagged low-confidence', () => {
    const r = classifyPatch(many({ r: 230, g: 90, b: 40 }))
    expect(['R', 'O']).toContain(r.color)
    expect(r.low).toBe(true)
  })
  it('glare pixels (V>0.97 & S<0.1) are excluded before classification', () => {
    const red = many({ r: 196, g: 30, b: 58 }, 60)
    const glare = many({ r: 255, g: 255, b: 255 }, 4)
    expect(classifyPatch([...red, ...glare]).color).toBe('R')
  })
})
