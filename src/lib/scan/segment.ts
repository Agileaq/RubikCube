import { rgbToHsv, type Rgb } from '../colors'

export interface Blob {
  cx: number; cy: number; area: number
  minX: number; minY: number; maxX: number; maxY: number
}
export type DetectResult =
  | { ok: true; blobs: Blob[] }
  | { ok: false; reason: 'blobs' }

// 分割参数（可调）：贴纸 = 饱和彩色块 或 亮块（白贴纸）；其余交给面积/形状过滤。
export const SEG = {
  S_MIN: 0.25,       // 饱和下限（彩色贴纸）
  V_MIN: 0.2,        // 明度下限（过滤阴影）
  V_BRIGHT: 0.72,    // 亮块下限（白贴纸）
  MIN_AREA: 16,      // 连通域最小像素数
  AREA_LOG_SPAN: 0.7,// 相对中位面积的对数容差
  ASPECT_LO: 0.55,   // 外接框长宽比下限
  ASPECT_HI: 1.8,    // 外接框长宽比上限
}

export function detectBlobs(img: ImageData): DetectResult {
  const { width: w, height: h, data } = img
  // 1. 贴纸掩膜
  const mask = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
    const { s, v } = rgbToHsv({ r: data[j], g: data[j + 1], b: data[j + 2] } as Rgb)
    mask[i] = ((s > SEG.S_MIN && v > SEG.V_MIN) || v > SEG.V_BRIGHT) ? 1 : 0
  }
  // 2. 3×3 中值去噪
  const den = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += mask[(y + dy) * w + x + dx]
      den[y * w + x] = n >= 5 ? 1 : 0
    }
  }
  // 3. 4-连通域（迭代栈，避免递归爆栈）
  const seen = new Uint8Array(w * h)
  const blobs: Blob[] = []
  const stack: number[] = []
  for (let start = 0; start < den.length; start++) {
    if (!den[start] || seen[start]) continue
    stack.length = 0; stack.push(start); seen[start] = 1
    let area = 0, sx = 0, sy = 0, minX = w, minY = h, maxX = 0, maxY = 0
    while (stack.length > 0) {
      const idx = stack.pop()!
      const x = idx % w, y = (idx / w) | 0
      area++; sx += x; sy += y
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      if (x > 0 && den[idx - 1] && !seen[idx - 1]) { seen[idx - 1] = 1; stack.push(idx - 1) }
      if (x < w - 1 && den[idx + 1] && !seen[idx + 1]) { seen[idx + 1] = 1; stack.push(idx + 1) }
      if (y > 0 && den[idx - w] && !seen[idx - w]) { seen[idx - w] = 1; stack.push(idx - w) }
      if (y < h - 1 && den[idx + w] && !seen[idx + w]) { seen[idx + w] = 1; stack.push(idx + w) }
    }
    if (area < SEG.MIN_AREA) continue
    const bw = maxX - minX + 1, bh = maxY - minY + 1
    const aspect = bw / bh
    if (aspect < SEG.ASPECT_LO || aspect > SEG.ASPECT_HI) continue
    blobs.push({ cx: sx / area, cy: sy / area, area, minX, minY, maxX, maxY })
  }
  if (blobs.length === 0) return { ok: false, reason: 'blobs' }
  // 4. 相对中位面积的过滤（皮肤/背景大块或碎片被剔除）
  const areas = blobs.map(b => b.area).sort((a, b) => a - b)
  const med = areas[areas.length >> 1]
  const kept = blobs.filter(b => Math.abs(Math.log(b.area / med)) < SEG.AREA_LOG_SPAN)
  if (kept.length !== 9) return { ok: false, reason: 'blobs' }
  return { ok: true, blobs: kept }
}
