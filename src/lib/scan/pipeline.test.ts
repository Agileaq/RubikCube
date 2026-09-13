// src/lib/scan/pipeline.test.ts
import { describe, it, expect } from 'vitest'
import { scanFace } from './pipeline'
import { makeGridImage } from './makeGridImage'
import type { Color } from '../../types'

const FACE: (Color | null)[] = ['W','O','G','R','B','Y','G','W','R']

describe('scanFace', () => {
  it('classifies all 9 cells on an upright grid', () => {
    const r = scanFace(makeGridImage(FACE))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cells.flat().map(c => c.color)).toEqual(FACE)
    expect(r.center).toBe('B')
  })
  it('survives 15° rotation with all colors intact', () => {
    const r = scanFace(makeGridImage(FACE, { rot: 15 * Math.PI / 180 }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cells.flat().map(c => c.color)).toEqual(FACE)
  })
  it('glared cell still classifies correctly (median robustness)', () => {
    const r = scanFace(makeGridImage(FACE, { glare: [1] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cells[0][1].color).toBe('O')
  })
  it('missing sticker → structured failure', () => {
    const r = scanFace(makeGridImage(FACE, { drop: 8 }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('blobs')
  })
})
