import type { Color } from '../../types'
import { COLOR_HEX, hexToRgb, type Rgb } from '../colors'

export interface GridOpts {
  size?: number        // 正方形边长，默认 192
  rot?: number         // 整体顺时针旋转弧度（绕图像中心），默认 0
  glare?: number[]     // 需要加高光的格子下标（0-8，行优先）
  bg?: Rgb             // 背景色，默认深灰 { r: 40, g: 38, b: 36 }
  drop?: number        // 挖掉某个格子（模拟遮挡），下标
}

// 在 ImageData 上手绘一个 3×3 贴纸阵：逆旋转映射回晶格坐标，
// 距某格中心 ≤ 0.36*step 即属于该格。纯像素写入，无需 canvas。
export function makeGridImage(colors: (Color | null)[], opts: GridOpts = {}): ImageData {
  const size = opts.size ?? 192
  const step = size / 3
  const bg = opts.bg ?? { r: 40, g: 38, b: 36 }
  const rot = -(opts.rot ?? 0) // 逆变换
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const cellColor = (k: number): Rgb | null => {
    const c = colors[k]
    return c ? hexToRgb(COLOR_HEX[c]) : null
  }
  const img = new ImageData(size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2 + 0.5, dy = y - size / 2 + 0.5
      const lx = dx * cos - dy * sin + size / 2
      const ly = dx * sin + dy * cos + size / 2
      const col = Math.floor(lx / step), row = Math.floor(ly / step)
      let px: Rgb = bg
      if (col >= 0 && col < 3 && row >= 0 && row < 3) {
        const k = row * 3 + col
        if (k !== opts.drop) {
          const ccx = (col + 0.5) * step, ccy = (row + 0.5) * step
          const dist = Math.hypot(lx - ccx, ly - ccy)
          if (dist <= step * 0.36) {
            px = cellColor(k) ?? bg
            if (opts.glare?.includes(k) && dist < step * 0.06) px = { r: 252, g: 252, b: 252 }
          }
        }
      }
      const o = (y * size + x) * 4
      d[o] = px.r; d[o + 1] = px.g; d[o + 2] = px.b; d[o + 3] = 255
    }
  }
  return img
}
