import { describe, it, expect } from 'vitest'
import type { Color } from '../../types'
import { detectBlobs } from './segment'
import { makeGridImage } from './makeGridImage'

const FACE: (Color | null)[] = ['W','W','W','G','G','G','Y','Y','Y']

describe('detectBlobs', () => {
  it('finds exactly 9 blobs on an upright grid', () => {
    const r = detectBlobs(makeGridImage(FACE))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.blobs).toHaveLength(9)
  })
  it('still finds 9 blobs at 15° rotation', () => {
    const r = detectBlobs(makeGridImage(FACE, { rot: 15 * Math.PI / 180 }))
    expect(r.ok).toBe(true)
  })
  it('fails when a sticker is missing', () => {
    const r = detectBlobs(makeGridImage(FACE, { drop: 4 }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('blobs')
  })
  it('blob centroids are near their lattice positions', () => {
    const r = detectBlobs(makeGridImage(FACE))
    if (!r.ok) throw new Error('expected ok')
    const tl = r.blobs.find(b => b.cx < 96 && b.cy < 96)!
    expect(tl.cy).toBeLessThan(64 + 12)
    expect(tl.cx).toBeLessThan(64 + 12)
  })
})
