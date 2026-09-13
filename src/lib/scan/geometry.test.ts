import { describe, it, expect } from 'vitest'
import { orderGrid } from './geometry'
import { detectBlobs } from './segment'
import { makeGridImage } from './makeGridImage'
import type { Color } from '../../types'

// 三行颜色不同，用于检验行拓扑（不镜像、不颠倒）
const ROWS: (Color | null)[] = ['W','W','W','G','G','G','Y','Y','Y']

function ordered(colors: (Color | null)[], rot = 0) {
  const det = detectBlobs(makeGridImage(colors, { rot }))
  if (!det.ok) throw new Error('detect failed')
  return orderGrid(det.blobs)
}

describe('orderGrid', () => {
  it('upright grid maps row-major with screen orientation', () => {
    const r = ordered(ROWS)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.grid[0][0].cy).toBeLessThan(r.grid[2][0].cy)
    expect(r.grid[0][0].cx).toBeLessThan(r.grid[0][2].cx)
  })
  it('15° rotation keeps the same topology', () => {
    const r = ordered(ROWS, 15 * Math.PI / 180)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.grid[0][0].cy).toBeLessThan(r.grid[2][0].cy)
    expect(r.grid[0][0].cx).toBeLessThan(r.grid[0][2].cx)
  })
  it('180° rotation does NOT mirror or flip (sign anchoring)', () => {
    const r = ordered(ROWS, Math.PI)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.grid[0][0].cy).toBeLessThan(r.grid[2][0].cy)
    expect(r.grid[0][0].cx).toBeLessThan(r.grid[0][2].cx)
  })
  it('rejects a non-9 input', () => {
    expect(orderGrid([]).ok).toBe(false)
  })
})
