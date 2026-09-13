// src/lib/scan/pipeline.test.ts
import { describe, it, expect } from 'vitest'
import { scanFace } from './pipeline'
import { makeFaceImage } from './makeFaceImage'
import type { Color } from '../../types'

const FACE: Color[] = ['W', 'O', 'G', 'R', 'B', 'Y', 'G', 'W', 'R']

const asGrid = (f: Color[]): Color[][] => [f.slice(0, 3), f.slice(3, 6), f.slice(6, 9)]
// 顺时针旋转 3×3 一次（与 ScannerOverlay 的 rot90 同构）
const rotCW = (g: Color[][]): Color[][] => [0, 1, 2].map(c => [0, 1, 2].map(r => g[2 - r][c]))

describe('scanFace', () => {
  it('classifies all 9 cells on an upright stickerless face', () => {
    const r = scanFace(makeFaceImage(FACE))
    expect(r.ok).toBe(true)
    expect(r.cells.flat().map(c => c.color)).toEqual(FACE)
    expect(r.center).toBe('B')
  })
  it('dodges 1px seams on a seamed stickerless face', () => {
    const r = scanFace(makeFaceImage(FACE, { seams: true }))
    expect(r.ok).toBe(true)
    expect(r.cells.flat().map(c => c.color)).toEqual(FACE)
  })
  it('content rotated 90° returns the screen-true rotated grid (cells[0] = image-top row)', () => {
    const r = scanFace(makeFaceImage(FACE, { rot: 1 }))
    expect(r.ok).toBe(true)
    expect(r.cells.map(row => row.map(c => c.color))).toEqual(rotCW(asGrid(FACE)))
    expect(r.center).toBe('B')
  })
  it('glared cell still classifies correctly (glare filtering in classify)', () => {
    const r = scanFace(makeFaceImage(FACE, { glare: [1] }))
    expect(r.ok).toBe(true)
    expect(r.cells[0][1].color).toBe('O')
  })
})
