// src/lib/scan/pipeline.ts
// 修订 1：定点采样取代连通域分割。不找色块——对引导框区域按 3×3 等分，
// 每格在 ±15% 偏移的 9 个候选窗口中取像素方差最小者（避开拼缝/高光），
// 喂给 classify.ts。恒成功：对齐偏差由核对 UI（方位十字 + 点格改色）兜底。
import type { Color } from '../../types'
import type { Rgb } from '../colors'
import { classifyPatch } from './classify'

export interface ScanCell { color: Color; confidence: number; low: boolean }
export interface ScanResult { ok: true; cells: ScanCell[][]; center: Color }

// 引导框边长占正方形图像的比例（居中；UI 的 .scan-guide 同为 78%）
export const GUIDE_FRAC = 0.78
// 每格采样窗口边长占格宽的比例
export const CELL_INNER = 0.4
// 避缝/避高光的窗口偏移搜索（相对格宽）
export const REFINE_OFFS = [-0.15, 0, 0.15]
// 单窗口采样像素上限（步长 2；384px 图的窗口为 21×21=441 个候选，400 会截断）
const MAX_SAMPLES = 500

function windowBounds(img: ImageData, cx: number, cy: number, half: number) {
  return {
    x0: Math.max(0, Math.round(cx - half)),
    x1: Math.min(img.width - 1, Math.round(cx + half)),
    y0: Math.max(0, Math.round(cy - half)),
    y1: Math.min(img.height - 1, Math.round(cy + half)),
  }
}

// 窗口内像素（步长 2，上限 ~400）
function windowPixels(img: ImageData, cx: number, cy: number, half: number): Rgb[] {
  const { x0, x1, y0, y1 } = windowBounds(img, cx, cy, half)
  const px: Rgb[] = []
  for (let y = y0; y <= y1 && px.length < MAX_SAMPLES; y += 2) {
    for (let x = x0; x <= x1 && px.length < MAX_SAMPLES; x += 2) {
      const o = (y * img.width + x) * 4
      px.push({ r: img.data[o], g: img.data[o + 1], b: img.data[o + 2] })
    }
  }
  return px
}

// score = 逐通道方差之和：纯色格 ≈ 0，跨缝/跨高光显著增大
function varianceScore(px: Rgb[]): number {
  const n = px.length
  if (!n) return Infinity
  const sum = (f: (p: Rgb) => number) => px.reduce((s, p) => s + f(p), 0)
  const mr = sum(p => p.r) / n, mg = sum(p => p.g) / n, mb = sum(p => p.b) / n
  return sum(p => (p.r - mr) ** 2 + (p.g - mg) ** 2 + (p.b - mb) ** 2) / n
}

export function scanFace(img: ImageData): ScanResult {
  // capture.ts 保证输出正方形；取 min 做 API 误用防护，非正方形输入不越界
  const size = Math.min(img.width, img.height)
  const off = ((1 - GUIDE_FRAC) / 2) * size
  const cell = (GUIDE_FRAC * size) / 3
  const half = (CELL_INNER * cell) / 2
  const cells = [0, 1, 2].map(r => [0, 1, 2].map(c => {
    const cx = off + (c + 0.5) * cell
    const cy = off + (r + 0.5) * cell
    let best: Rgb[] = []
    let bestScore = Infinity
    for (const dy of REFINE_OFFS) {
      for (const dx of REFINE_OFFS) {
        const px = windowPixels(img, cx + dx * cell, cy + dy * cell, half)
        const score = varianceScore(px)
        if (score < bestScore) { bestScore = score; best = px }
      }
    }
    return classifyPatch(best)
  }))
  return { ok: true, cells, center: cells[1][1].color }
}
