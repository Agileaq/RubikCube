import type { Color } from '../../types'
import { COLOR_HEX, hexToRgb, rgbToHsv, rgbToLab, deltaE94, type Rgb } from '../colors'

// 真机加固 #1：暖光下白/黄仅靠 Lab 距离易混淆，低饱和高亮度先强制判白。
export const WHITE_S_MAX = 0.18
export const WHITE_V_MIN = 0.6
// 镜面高光：先剔除再取中值。
const GLARE_S_MAX = 0.1
const GLARE_V_MIN = 0.97
// 置信度低于该值 → UI 加警示边框。
export const LOW_CONFIDENCE = 0.35

const REFERENCES = Object.fromEntries(
  (Object.keys(COLOR_HEX) as Color[]).map(c => [c, rgbToLab(hexToRgb(COLOR_HEX[c]))]),
) as Record<Color, ReturnType<typeof rgbToLab>>

export interface ClassifyResult { color: Color; confidence: number; low: boolean }

function medianChannel(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return s[s.length >> 1]
}

function medianRgb(samples: Rgb[]): Rgb {
  return {
    r: medianChannel(samples.map(p => p.r)),
    g: medianChannel(samples.map(p => p.g)),
    b: medianChannel(samples.map(p => p.b)),
  }
}

export function classifyPatch(samples: Rgb[]): ClassifyResult {
  const px = samples.filter(p => {
    const { s, v } = rgbToHsv(p)
    return !(v > GLARE_V_MIN && s < GLARE_S_MAX)
  })
  const med = medianRgb(px.length > 0 ? px : samples)
  const { s, v } = rgbToHsv(med)
  if (s < WHITE_S_MAX && v > WHITE_V_MIN) {
    const confidence = Math.max(0, Math.min(
      (WHITE_S_MAX - s) / WHITE_S_MAX,
      (v - WHITE_V_MIN) / (1 - WHITE_V_MIN),
    ))
    return { color: 'W', confidence, low: confidence < LOW_CONFIDENCE }
  }
  const lab = rgbToLab(med)
  let best: Color = 'W', bestD = Infinity, second = Infinity
  for (const c of Object.keys(REFERENCES) as Color[]) {
    const d = deltaE94(lab, REFERENCES[c])
    if (d < bestD) { second = bestD; best = c; bestD = d }
    else if (d < second) second = d
  }
  const confidence = Math.max(0, Math.min(1, (second - bestD) / 12))
  return { color: best, confidence, low: confidence < LOW_CONFIDENCE }
}
