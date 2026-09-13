// src/lib/scan/pipeline.test.ts
import { describe, it, expect } from 'vitest'
import { scanFace, GUIDE_FRAC, CELL_INNER } from './pipeline'
import { classifyPatch } from './classify'
import { makeFaceImage } from './makeFaceImage'
import type { Color } from '../../types'
import type { Rgb } from '../colors'

const FACE: Color[] = ['W', 'O', 'G', 'R', 'B', 'Y', 'G', 'W', 'R']

const asGrid = (f: Color[]): Color[][] => [f.slice(0, 3), f.slice(3, 6), f.slice(6, 9)]
// 顺时针旋转 3×3 一次（旋转配色，不转图像）
const rotCW = (g: Color[][]): Color[][] => [0, 1, 2].map(c => [0, 1, 2].map(r => g[2 - r][c]))

// 复刻 pipeline 的居中窗口采样（步长 2）：用于证明斑点能压过居中窗的中位数
function centeredWindow(img: ImageData, index: number): Rgb[] {
  const size = Math.min(img.width, img.height)
  const off = ((1 - GUIDE_FRAC) / 2) * size
  const cell = (GUIDE_FRAC * size) / 3
  const half = (CELL_INNER * cell) / 2
  const cx = off + ((index % 3) + 0.5) * cell
  const cy = off + (Math.floor(index / 3) + 0.5) * cell
  const x0 = Math.max(0, Math.round(cx - half)), x1 = Math.min(img.width - 1, Math.round(cx + half))
  const y0 = Math.max(0, Math.round(cy - half)), y1 = Math.min(img.height - 1, Math.round(cy + half))
  const px: Rgb[] = []
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const o = (y * img.width + x) * 4
      px.push({ r: img.data[o], g: img.data[o + 1], b: img.data[o + 2] })
    }
  }
  return px
}

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
  it('variance selection dodges a solid blotch centered on a cell', () => {
    // 几何数据（384px fixture）：cell = 0.78·384/3 ≈ 99.8px，窗口半宽 = 0.2·cell ≈ 20px，
    // 避缝偏移 = ±0.15·cell ≈ ±15px。圆斑半径 0.17·cell ≈ 17px：
    //   - 覆盖居中 40×40 窗口 ≈56% 的像素 → 逐通道中位数读出斑色（诚实干扰：居中必错）
    //   - 轴向偏移窗口 ≈39%、对角偏移窗口 ≈26% → 中位数仍是真色，方差最小者必为偏移窗
    // 格 1 真色 O（不被白色预判/高光剔除），斑色 B，两者 ΔE 极远。
    const img = makeFaceImage(FACE, { blotch: { index: 1, dx: 0, dy: 0 } })
    expect(classifyPatch(centeredWindow(img, 1)).color).toBe('B') // 居中窗确实被骗
    const r = scanFace(img)
    expect(r.ok).toBe(true)
    expect(r.cells[0][1].color).toBe('O') // 方差选窗躲开圆斑，仍分类为真色
  })
})
