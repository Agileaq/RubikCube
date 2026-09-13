// src/lib/scan/pipeline.ts
import type { Color } from '../../types'
import type { Rgb } from '../colors'
import { detectBlobs, type Blob } from './segment'
import { orderGrid } from './geometry'
import { classifyPatch } from './classify'

export interface ScanCell { color: Color; confidence: number; low: boolean }
export type ScanResult =
  | { ok: true; cells: ScanCell[][]; center: Color }
  | { ok: false; reason: 'blobs' | 'grid' }

// 取 blob 外接框内圈 40% 区域的像素（边缘 30% 裁掉，规避格间渗色）。
function patchPixels(img: ImageData, b: Blob): Rgb[] {
  const bw = b.maxX - b.minX + 1, bh = b.maxY - b.minY + 1
  const x0 = Math.round(b.minX + bw * 0.3), x1 = Math.round(b.maxX - bw * 0.3)
  const y0 = Math.round(b.minY + bh * 0.3), y1 = Math.round(b.maxY - bh * 0.3)
  const out: Rgb[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const o = (y * img.width + x) * 4
      out.push({ r: img.data[o], g: img.data[o + 1], b: img.data[o + 2] })
    }
  }
  return out
}

export function scanFace(img: ImageData): ScanResult {
  const det = detectBlobs(img)
  if (!det.ok) return det
  const g = orderGrid(det.blobs)
  if (!g.ok) return g
  const cells = g.grid.map(row => row.map(b => classifyPatch(patchPixels(img, b))))
  return { ok: true, cells, center: cells[1][1].color }
}
