// src/lib/scan/makeFaceImage.ts
// 测试 fixture：合成一张「单面照片」——正方形 ImageData，中央引导框区域内
// 3×3 色块**完全填满格子**（stickerless，相邻色相触），框外深灰背景。
// 纯像素写入，无需 canvas（jsdom 无 2D 上下文也能跑）。
import type { Color } from '../../types'
import { COLOR_HEX, hexToRgb, type Rgb } from '../colors'
import { GUIDE_FRAC } from './pipeline'

export interface FaceImageOpts {
  seams?: boolean   // 1px 深色缝线（贴纸款模拟；min-variance 须避开）
  rot?: number      // 内容顺时针旋转的 90° 次数——转配色，不转图像
  glare?: number[]  // 加高光圆的格子下标（0-8，行优先，屏幕朝向）
  blotch?: { index: number; dx: number; dy: number } // 实心异色圆斑（干扰方差选窗）
  size?: number     // 正方形边长，默认 384
  bg?: Rgb          // 引导框外背景，默认深灰
}

// 顺时针旋转 3×3 一次（旋转配色，不转图像）
const rot90 = (g: Color[][]): Color[][] => [0, 1, 2].map(c => [0, 1, 2].map(r => g[2 - r][c]))

export function makeFaceImage(colors: Color[], opts: FaceImageOpts = {}): ImageData {
  const size = opts.size ?? 384
  const bg = opts.bg ?? { r: 40, g: 38, b: 36 }
  let grid: Color[][] = [colors.slice(0, 3), colors.slice(3, 6), colors.slice(6, 9)]
  for (let i = 0; i < (opts.rot ?? 0) % 4; i++) grid = rot90(grid)
  const img = new ImageData(size, size)
  const d = img.data
  const put = (x: number, y: number, px: Rgb) => {
    const o = (y * size + x) * 4
    d[o] = px.r; d[o + 1] = px.g; d[o + 2] = px.b; d[o + 3] = 255
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) put(x, y, bg)
  }
  const off = ((1 - GUIDE_FRAC) / 2) * size
  const cell = (GUIDE_FRAC * size) / 3
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rgb = hexToRgb(COLOR_HEX[grid[r][c]])
      const x0 = Math.round(off + c * cell), x1 = Math.round(off + (c + 1) * cell) - 1
      const y0 = Math.round(off + r * cell), y1 = Math.round(off + (r + 1) * cell) - 1
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, rgb)
      if (opts.glare?.includes(r * 3 + c)) {
        const cx = off + (c + 0.5) * cell, cy = off + (r + 0.5) * cell
        const rad = cell * 0.06
        for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
          for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
            if (Math.hypot(x - cx, y - cy) <= rad) put(x, y, { r: 252, g: 252, b: 252 })
          }
        }
      }
      // 异色圆斑：半径 0.17·cell，圆心=格中心+(dx,dy)·cell（dx/dy 为格宽比例）。
      // 斑色取与该格真色 ΔE 最远的蓝（该格本就是蓝时取白）；两者都不触发
      // classify 的白色预判/高光剔除，干扰只来自方差选窗。
      if (opts.blotch && opts.blotch.index === r * 3 + c) {
        const { dx, dy } = opts.blotch
        const cx = off + (c + 0.5 + dx) * cell, cy = off + (r + 0.5 + dy) * cell
        const rad = cell * 0.17
        const blobHex = COLOR_HEX[grid[r][c] === 'B' ? 'W' : 'B']
        const rgb = hexToRgb(blobHex)
        for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
          for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
            if (Math.hypot(x - cx, y - cy) <= rad) put(x, y, rgb)
          }
        }
      }
    }
  }
  if (opts.seams) {
    const seam: Rgb = { r: 24, g: 24, b: 24 }
    const a = Math.round(off), b = Math.round(off + 3 * cell)
    for (const k of [1, 2]) {
      const s = Math.round(off + k * cell)
      for (let i = a; i < b; i++) { put(s, i, seam); put(i, s, seam) }
    }
  }
  return img
}
