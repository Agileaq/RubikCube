import { describe, it, expect } from 'vitest'
import type { Color } from '../../types'
import { detectBlobs } from './segment'
import { makeGridImage } from './makeGridImage'

const FACE: (Color | null)[] = ['W','W','W','G','G','G','Y','Y','Y']

function pokePixel(img: ImageData, x: number, y: number, r: number, g: number, b: number) {
  const o = (y * img.width + x) * 4
  img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255
}

describe('detectBlobs', () => {
  it('finds exactly 9 blobs on an upright grid', () => {
    const r = detectBlobs(makeGridImage(FACE))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.blobs).toHaveLength(9)
  })
  it('ignores isolated stray bright pixels far from the grid', () => {
    const img = makeGridImage(FACE)
    const strays: [number, number][] = [
      [64, 64], [100, 64], [160, 64], [64, 100], [64, 160], [130, 130],
    ]
    for (const [x, y] of strays) pokePixel(img, x, y, 250, 250, 250)
    const r = detectBlobs(img)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.blobs).toHaveLength(9)
  })
  it('fails when a large bright distractor covers the top band', () => {
    const img = makeGridImage(FACE)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < img.width; x++) pokePixel(img, x, y, 255, 0, 255)
    }
    const r = detectBlobs(img)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('blobs')
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
    const size = 192
    const step = size / 3
    const r = detectBlobs(makeGridImage(FACE, { size }))
    if (!r.ok) throw new Error('expected ok')
    const tl = r.blobs.find(b => b.cx < step && b.cy < step)!
    expect(Math.abs(tl.cx - step / 2)).toBeLessThan(12)
    expect(Math.abs(tl.cy - step / 2)).toBeLessThan(12)
  })
})
