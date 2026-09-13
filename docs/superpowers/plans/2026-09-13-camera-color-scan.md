# 摄像头/图片识别魔方单面色块 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Paint 页新增「拍照识别」：摄像头拍照或上传单面照片，浏览器内纯手写 CV 管线识别 3×3 色块，核对修正后一键填入当前面。

**Architecture:** 四段纯函数管线（capture → segment → geometry → classify）+ 全屏 ScannerOverlay 弹层。识别结果不直接写状态，经核对/旋转/改色后经 `useApp.setFace` 写入。识别算法无 AI 模型、零新依赖；「找 9 格」将来可替换为 ONNX 检测器。

**Tech Stack:** React 19 + TypeScript + Vitest（现仓库栈）；纯 TS 实现 HSV 分割 / PCA 几何排序 / Lab ΔE94 颜色分类。

**Spec:** `docs/superpowers/specs/2026-09-13-camera-color-scan-design.md`

## Global Constraints

- **零新依赖**：不新增任何 npm 包。
- 所有新文件用现有代码风格：2 空格缩进、单引号、无分号省略（与现有文件一致的分号风格）、`import type` 分离。
- 识别管线文件（`src/lib/scan/` 下除 fixture 外）不碰 DOM（`ImageType`/数值进出）；DOM 操作只允许在 `capture.ts` 与组件里。
- 每个任务完成即 `git commit && git push`（用户常设指令）。
- i18n：6 个语言文件（zh/en/fr/es/ru/ar）同步补键，`Dict` 类型同步更新；插值用 `.replace('{x}', …)` 模式（同 `solve.speed`）。
- 颜色参考 hex 必须与 UI 色板一致（本计划将色板常量抽到 `src/lib/colors.ts` 单一来源）。
- iOS 兼容：`<video>` 必须带 `playsInline`、`muted`、`autoPlay`（真机加固 #3）。
- 中心格（index 4）永远不被 `setFace` 修改（与 `remainingCounts` 的不变量一致）。
- 测试命令：`npx vitest run`（全量）、`npx vitest run src/lib/scan/classify.test.ts`（单文件）；类型检查：`npx tsc --noEmit`。

---

### Task 1: 颜色数学基础设施 `src/lib/colors.ts` + Palette 单一来源化

**Files:**
- Create: `src/lib/colors.ts`
- Create: `src/lib/colors.test.ts`
- Modify: `src/components/Palette.tsx:3-4`

**Interfaces:**
- Consumes: `Color` 类型（`src/types.ts`）
- Produces: `COLOR_ORDER: Color[]`、`COLOR_HEX: Record<Color, string>`、`interface Rgb {r,g,b}`、`rgbToHsv(Rgb): {h,s,v}`、`rgbToLab(Rgb): {L,a,b}`、`deltaE94(lab1, lab2): number`、`hexToRgb(hex): Rgb` — Task 2/9 依赖。

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/colors.test.ts
import { describe, it, expect } from 'vitest'
import { hexToRgb, rgbToHsv, rgbToLab, deltaE94, COLOR_HEX } from './colors'

describe('colors', () => {
  it('hexToRgb parses palette hexes', () => {
    expect(hexToRgb('#ff8c00')).toEqual({ r: 255, g: 140, b: 0 })
    expect(hexToRgb('#f8f8f8')).toEqual({ r: 248, g: 248, b: 248 })
  })
  it('rgbToHsv: pure yellow is saturated and bright', () => {
    const { s, v } = rgbToHsv({ r: 255, g: 213, b: 0 })
    expect(s).toBeCloseTo(1, 5)
    expect(v).toBeCloseTo(1, 5)
  })
  it('rgbToHsv: gray has zero saturation', () => {
    expect(rgbToHsv({ r: 128, g: 128, b: 128 }).s).toBe(0)
  })
  it('rgbToLab: white ≈ L=100, a≈0, b≈0', () => {
    const { L, a, b } = rgbToLab({ r: 255, g: 255, b: 255 })
    expect(L).toBeCloseTo(100, 1)
    expect(Math.abs(a)).toBeLessThan(0.5)
    expect(Math.abs(b)).toBeLessThan(0.5)
  })
  it('deltaE94: identical colors are 0, yellow/orange clearly differ', () => {
    const lab = rgbToLab({ r: 255, g: 213, b: 0 })
    expect(deltaE94(lab, lab)).toBe(0)
    expect(deltaE94(rgbToLab({ r: 255, g: 213, b: 0 }), rgbToLab({ r: 255, g: 140, b: 0 }))).toBeGreaterThan(5)
  })
  it('palette hex table has all 6 colors', () => {
    expect(Object.keys(COLOR_HEX).sort()).toEqual(['B', 'G', 'O', 'R', 'W', 'Y'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/colors.test.ts`
Expected: FAIL（`./colors` 不存在）

- [ ] **Step 3: 实现 `src/lib/colors.ts`**

```ts
import type { Color } from '../types'

// Single source of truth for palette colors: the UI chips (Palette.tsx) and
// the scanner classifier (lib/scan/classify.ts) must agree on the 6 colors.
export const COLOR_ORDER: Color[] = ['Y', 'R', 'B', 'W', 'O', 'G']
export const COLOR_HEX: Record<Color, string> = {
  W: '#f8f8f8', Y: '#ffd500', R: '#c41e3a', O: '#ff8c00', G: '#009e60', B: '#0051ba',
}

export interface Rgb { r: number; g: number; b: number }
export interface Lab { L: number; a: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHsv({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const rf = r / 255, gf = g / 255, bf = b / 255
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === rf) h = ((gf - bf) / d + 6) % 6
    else if (max === gf) h = (bf - rf) / d + 2
    else h = (rf - gf) / d + 4
    h *= 60
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function rgbToLab({ r, g, b }: Rgb): Lab {
  const f = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }
  const R = f(r), G = f(g), B = f(b)
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const g2 = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = g2(X), fy = g2(Y), fz = g2(Z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

// CIE ΔE94 (graphic-arts weights kL=kC=kH=1).
export function deltaE94(l1: Lab, l2: Lab): number {
  const dL = l1.L - l2.L
  const c1 = Math.hypot(l1.a, l1.b)
  const c2 = Math.hypot(l2.a, l2.b)
  const dC = c1 - c2
  const dA = l1.a - l2.a
  const dB = l1.b - l2.b
  const dH2 = Math.max(0, dA * dA + dB * dB - dC * dC)
  const sl = 1
  const sc = 1 + 0.045 * c1
  const sh = 1 + 0.015 * c1
  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + dH2 / (sh * sh))
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/colors.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Palette 改为引用单一来源**

`src/components/Palette.tsx` 第 3-4 行替换为：

```ts
import { COLOR_ORDER, COLOR_HEX } from '../lib/colors'
```

并删除组件文件内原有的 `ORDER`/`HEX` 常量，组件体内 `ORDER.map` 改为 `COLOR_ORDER.map`、`HEX[c]` 改为 `COLOR_HEX[c]`。

- [ ] **Step 6: 全量回归 + 提交**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 全部 PASS（Palette 相关测试不受影响）

```bash
git add src/lib/colors.ts src/lib/colors.test.ts src/components/Palette.tsx
git commit -m "feat(scan): color math foundation + palette single source"
git push
```

---

### Task 2: 颜色分类 `src/lib/scan/classify.ts`（含白色预判，真机加固 #1）

**Files:**
- Create: `src/lib/scan/classify.ts`
- Create: `src/lib/scan/classify.test.ts`

**Interfaces:**
- Consumes: `COLOR_HEX`/`rgbToHsv`/`rgbToLab`/`deltaE94`/`Rgb`（Task 1）
- Produces: `interface ClassifyResult { color: Color; confidence: number; low: boolean }`、`classifyPatch(samples: Rgb[]): ClassifyResult` — Task 5 依赖。

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/scan/classify.test.ts
import { describe, it, expect } from 'vitest'
import { classifyPatch } from './classify'
import type { Rgb } from '../colors'

const many = (rgb: Rgb, n = 64): Rgb[] => Array.from({ length: n }, () => rgb)

describe('classifyPatch', () => {
  it('white daylight sticker → W via the white pre-rule (high confidence)', () => {
    const r = classifyPatch(many({ r: 245, g: 245, b: 245 }))
    expect(r.color).toBe('W')
    expect(r.low).toBe(false)
  })
  it('warm desaturated white → W but flagged low (rule margin thin)', () => {
    const r = classifyPatch(many({ r: 255, g: 238, b: 214 }))
    expect(r.color).toBe('W')
    expect(r.low).toBe(true)
  })
  it('strong yellow never leaks into the white rule', () => {
    expect(classifyPatch(many({ r: 255, g: 213, b: 0 })).color).toBe('Y')
  })
  it('palette-like samples classify to their own colors', () => {
    expect(classifyPatch(many({ r: 196, g: 30, b: 58 })).color).toBe('R')
    expect(classifyPatch(many({ r: 255, g: 140, b: 0 })).color).toBe('O')
    expect(classifyPatch(many({ r: 0, g: 158, b: 96 })).color).toBe('G')
    expect(classifyPatch(many({ r: 0, g: 81, b: 186 })).color).toBe('B')
  })
  it('borderline red/orange is flagged low-confidence', () => {
    const r = classifyPatch(many({ r: 230, g: 90, b: 40 }))
    expect(['R', 'O']).toContain(r.color)
    expect(r.low).toBe(true)
  })
  it('glare pixels (V>0.97 & S<0.1) are excluded before classification', () => {
    const red = many({ r: 196, g: 30, b: 58 }, 60)
    const glare = many({ r: 255, g: 255, b: 255 }, 4)
    expect(classifyPatch([...red, ...glare]).color).toBe('R')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/scan/classify.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// src/lib/scan/classify.ts
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/scan/classify.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 提交**

```bash
git add src/lib/scan/classify.ts src/lib/scan/classify.test.ts
git commit -m "feat(scan): patch color classifier with white pre-rule (Lab dE94)"
git push
```

---

### Task 3: 合成测试图 fixture + 贴纸分割 `src/lib/scan/segment.ts`

**Files:**
- Create: `src/lib/scan/makeGridImage.ts`（仅供测试与人工调试使用的合成图生成器）
- Create: `src/lib/scan/segment.ts`
- Create: `src/lib/scan/segment.test.ts`

**Interfaces:**
- Consumes: `rgbToHsv`（Task 1）、`Color`、`COLOR_HEX`/`hexToRgb`（Task 1）
- Produces: `makeGridImage(colors: (Color|null)[9], opts?): ImageData`（测试 fixture）；`interface Blob { cx, cy, area, minX, minY, maxX, maxY }`、`type DetectResult = { ok: true; blobs: Blob[] } | { ok: false; reason: 'blobs' }`、`detectBlobs(img: ImageData): DetectResult` — Task 4/5 依赖。

- [ ] **Step 1: 写 fixture（不是被测代码，先于测试存在供测试使用）**

```ts
// src/lib/scan/makeGridImage.ts
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
export function makeGridImage(colors: (Color | null)[9], opts: GridOpts = {}): ImageData {
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
            if (opts.glare?.includes(k) && dist < step * 0.12) px = { r: 252, g: 252, b: 252 }
          }
        }
      }
      const o = (y * size + x) * 4
      d[o] = px.r; d[o + 1] = px.g; d[o + 2] = px.b; d[o + 3] = 255
    }
  }
  return img
}
```

- [ ] **Step 2: 写失败测试**

```ts
// src/lib/scan/segment.test.ts
import { describe, it, expect } from 'vitest'
import { detectBlobs } from './segment'
import { makeGridImage } from './makeGridImage'

const FACE: (Color | null)[] = ['W','W','W','G','G','G','Y','Y','Y']

describe('detectBlobs', () => {
  it('finds exactly 9 blobs on an upright grid', () => {
    const r = detectBlobs(makeGridImage(FACE))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.blobs).toHaveLength(9)
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
    const r = detectBlobs(makeGridImage(FACE))
    if (!r.ok) throw new Error('expected ok')
    const tl = r.blobs.find(b => b.cx < 96 && b.cy < 96)!
    expect(tl.cy).toBeLessThan(64 + 12)
    expect(tl.cx).toBeLessThan(64 + 12)
  })
})
```

（`import type { Color }` 按需补进测试文件头。）

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/scan/segment.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `src/lib/scan/segment.ts`**

```ts
// src/lib/scan/segment.ts
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
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run src/lib/scan/segment.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: 提交**

```bash
git add src/lib/scan/makeGridImage.ts src/lib/scan/segment.ts src/lib/scan/segment.test.ts
git commit -m "feat(scan): sticker segmentation (HSV mask + median denoise + CC)"
git push
```

---

### Task 4: 几何排序 `src/lib/scan/geometry.ts`（PCA 符号锚定，真机加固 #2）

**Files:**
- Create: `src/lib/scan/geometry.ts`
- Create: `src/lib/scan/geometry.test.ts`

**Interfaces:**
- Consumes: `Blob`（Task 3）
- Produces: `type GridResult = { ok: true; grid: Blob[][] } | { ok: false; reason: 'grid' }`、`orderGrid(blobs: Blob[]): GridResult` — Task 5 依赖。`grid[r][c]`：r=屏幕行（上→下），c=屏幕列（左→右）。

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/scan/geometry.test.ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/scan/geometry.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// src/lib/scan/geometry.ts
import type { Blob } from './segment'

export type GridResult =
  | { ok: true; grid: Blob[][] }
  | { ok: false; reason: 'grid' }

// 真机加固 #2：PCA 特征向量有 ± 符号不确定性，直接投影可能整体颠倒/镜像。
// 以图像坐标系（X 右、Y 下）为基准锚定：主轴 1 指向偏右（x>0），
// 主轴 2 取主轴 1 的垂直方向并指向偏下（y>0），保证 grid 拓扑与屏幕一致。
export function orderGrid(blobs: Blob[]): GridResult {
  if (blobs.length !== 9) return { ok: false, reason: 'grid' }
  const n = blobs.length
  const mx = blobs.reduce((s, b) => s + b.cx, 0) / n
  const my = blobs.reduce((s, b) => s + b.cy, 0) / n
  let cxx = 0, cyy = 0, cxy = 0
  for (const b of blobs) {
    const dx = b.cx - mx, dy = b.cy - my
    cxx += dx * dx; cyy += dy * dy; cxy += dx * dy
  }
  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy)
  let v1 = { x: Math.cos(theta), y: Math.sin(theta) }
  if (v1.x < 0 || (Math.abs(v1.x) < 1e-6 && v1.y < 0)) v1 = { x: -v1.x, y: -v1.y }
  let v2 = { x: -v1.y, y: v1.x }
  if (v2.y < 0) v2 = { x: -v2.x, y: -v2.y }
  const proj1 = blobs.map(b => b.cx * v1.x + b.cy * v1.y)
  const proj2 = blobs.map(b => b.cx * v2.x + b.cy * v2.y)
  const idx = blobs.map((_, i) => i).sort((a, b) => proj1[a] - proj1[b])
  // 沿主轴 1 切三行：在相邻投影间隙最大的两处断开
  const gaps = [0, 1].map(_ => 0)
  let g1 = 0, g1v = -Infinity, g2 = 0, g2v = -Infinity
  for (let i = 0; i < 8; i++) {
    const g = proj1[idx[i + 1]] - proj1[idx[i]]
    if (g > g1v) { g2v = g1v; g2 = g1; g1v = g; g1 = i }
    else if (g > g2v) { g2v = g; g2 = i }
  }
  const cuts = [Math.min(g1, g2), Math.max(g1, g2)]
  const rows = [idx.slice(0, cuts[0] + 1), idx.slice(cuts[0] + 1, cuts[1] + 1), idx.slice(cuts[1] + 1)]
  if (rows.some(r => r.length !== 3)) return { ok: false, reason: 'grid' }
  const grid = rows.map(row =>
    row.sort((a, b) => proj2[a] - proj2[b]).map(i => blobs[i]),
  )
  return { ok: true, grid }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/scan/geometry.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 提交**

```bash
git add src/lib/scan/geometry.ts src/lib/scan/geometry.test.ts
git commit -m "feat(scan): PCA grid ordering with sign anchoring"
git push
```

---

### Task 5: 管线编排 `src/lib/scan/pipeline.ts`

**Files:**
- Create: `src/lib/scan/pipeline.ts`
- Create: `src/lib/scan/pipeline.test.ts`

**Interfaces:**
- Consumes: `detectBlobs`（Task 3）、`orderGrid`（Task 4）、`classifyPatch`/`ClassifyResult`（Task 2）
- Produces: `interface ScanCell { color: Color; confidence: number; low: boolean }`、`type ScanResult = { ok: true; cells: ScanCell[][]; center: Color } | { ok: false; reason: 'blobs' | 'grid' }`、`scanFace(img: ImageData): ScanResult` — Task 9 依赖。`cells` 为屏幕方向 3×3（行优先），`center = cells[1][1].color`。

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/scan/pipeline.test.ts
import { describe, it, expect } from 'vitest'
import { scanFace } from './pipeline'
import { makeGridImage } from './makeGridImage'
import type { Color } from '../../types'

const FACE: (Color | null)[] = ['W','O','G','R','B','Y','G','W','R']

describe('scanFace', () => {
  it('classifies all 9 cells on an upright grid', () => {
    const r = scanFace(makeGridImage(FACE))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cells.flat().map(c => c.color)).toEqual(FACE)
    expect(r.center).toBe('B')
  })
  it('survives 15° rotation with all colors intact', () => {
    const r = scanFace(makeGridImage(FACE, { rot: 15 * Math.PI / 180 }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cells.flat().map(c => c.color)).toEqual(FACE)
  })
  it('glared cell still classifies correctly (median robustness)', () => {
    const r = scanFace(makeGridImage(FACE, { glare: [1] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.cells[0][1].color).toBe('O')
  })
  it('missing sticker → structured failure', () => {
    const r = scanFace(makeGridImage(FACE, { drop: 8 }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('blobs')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/scan/pipeline.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/scan/pipeline.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 全量回归 + 提交**

Run: `npx vitest run && npx tsc --noEmit`

```bash
git add src/lib/scan/pipeline.ts src/lib/scan/pipeline.test.ts
git commit -m "feat(scan): scanFace pipeline orchestration"
git push
```

---

### Task 6: 状态层 `useApp.setFace`

**Files:**
- Modify: `src/state/AppContext.tsx`（接口第 8-16 行区域 + value 实现第 31-40 行区域）
- Test: `src/state/AppContext.test.tsx`

**Interfaces:**
- Produces: `AppValue.setFace(face: Face, colors: (Color | null)[]): void` — 覆写 face 的 8 个非中心格（index 4 跳过、永不触碰）；Task 9 的确认按钮调用。

- [ ] **Step 1: 写失败测试**（追加到 `AppContext.test.tsx` 的 describe 内）

```tsx
function ScanProbe() {
  const { remaining, setBrush, paintSticker, setFace } = useApp()
  return (
    <div>
      <span data-testid="remW">{remaining.W}</span>
      <span data-testid="remG">{remaining.G}</span>
      <button onClick={() => setBrush('W')}>bw</button>
      <button onClick={() => paintSticker('U', 0)}>paint</button>
      <button onClick={() => setFace('U', ['G','G','G','G','G','G','G','G','G'])}>scanfill</button>
    </div>
  )
}

it('setFace overwrites the 8 non-center stickers in one shot', () => {
  render(<AppProvider><ScanProbe /></AppProvider>)
  act(() => { screen.getByText('bw').click() })
  act(() => { screen.getByText('paint').click() })
  expect(screen.getByTestId('remW').textContent).toBe('7')
  act(() => { screen.getByText('scanfill').click() })
  expect(screen.getByTestId('remW').textContent).toBe('8')
  expect(screen.getByTestId('remG').textContent).toBe('0')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: FAIL（`setFace is not a function`）

- [ ] **Step 3: 实现** — `AppValue` 接口（`paintSticker` 声明之后）加：

```ts
  setFace(face: Face, colors: (Color | null)[]): void
```

`value` 内（`paintSticker` 实现之后）加：

```ts
    setFace(face, colors) {
      setCube(prev => {
        const next = cloneCube(prev)
        for (let i = 0; i < 9; i++) {
          if (i === 4) continue
          next[face][i] = colors[i] ?? null
        }
        return next
      })
    },
```

- [ ] **Step 4: 跑测试确认通过 + 提交**

Run: `npx vitest run src/state/AppContext.test.tsx && npx tsc --noEmit`

```bash
git add src/state/AppContext.tsx src/state/AppContext.test.tsx
git commit -m "feat(state): setFace writes a whole face from scan results"
git push
```

---

### Task 7: i18n `scan.*` 键组（6 语言）

**Files:**
- Modify: `src/i18n/types.ts`（`Dict` 接口 `update` 之前）
- Modify: `src/i18n/zh.ts`、`src/i18n/en.ts`、`src/i18n/fr.ts`、`src/i18n/es.ts`、`src/i18n/ru.ts`、`src/i18n/ar.ts`

**Interfaces:**
- Produces: `t.scan.{open,title,capture,upload,retake,confirm,cancel,rotate,lowConfidence,centerMismatch,cameraDenied,notRecognized}` — Task 9/10 依赖。`centerMismatch` 含 `{x}`（识别到的中心色名）与 `{f}`（当前面名）占位符。

- [ ] **Step 1: `types.ts` 的 `Dict` 加（`update` 字段之前）：**

```ts
  scan: {
    open: string
    title: string
    capture: string
    upload: string
    retake: string
    confirm: string
    cancel: string
    rotate: string
    lowConfidence: string
    centerMismatch: string // {x}=seen center color name, {f}=expected face color name
    cameraDenied: string
    notRecognized: string
  }
```

- [ ] **Step 2: 六语言实现**（每组按各文件已有键顺序追加在 `update` 之前；颜色名/面名沿用各语言已有叫法，中文用 `白/黄/红/橙/蓝/绿`、`U/D/L/R/F/B` 面直接用字母+「面」）

zh:
```ts
  scan: {
    open: '拍照识别',
    title: '拍照识别色块',
    capture: '拍照',
    upload: '上传图片',
    retake: '重拍',
    confirm: '确认填入',
    cancel: '取消',
    rotate: '旋转',
    lowConfidence: '低置信度，请核对',
    centerMismatch: '中心是 {x}，当前面应为 {f}，请确认方向',
    cameraDenied: '无法访问相机，请改用上传图片',
    notRecognized: '未识别到完整 3×3，请正对单面、光线均匀后重试',
  },
```

en:
```ts
  scan: {
    open: 'Scan a face',
    title: 'Scan cube colors',
    capture: 'Capture',
    upload: 'Upload image',
    retake: 'Retake',
    confirm: 'Fill in',
    cancel: 'Cancel',
    rotate: 'Rotate',
    lowConfidence: 'Low confidence, please verify',
    centerMismatch: 'Center reads {x}, this face should be {f} — check the orientation',
    cameraDenied: 'Camera unavailable, use image upload instead',
    notRecognized: 'No full 3×3 grid found. Face the camera squarely with even lighting and retry',
  },
```

fr:
```ts
  scan: {
    open: 'Scanner une face',
    title: 'Scanner les couleurs du cube',
    capture: 'Photographier',
    upload: 'Téléverser une image',
    retake: 'Reprendre',
    confirm: 'Remplir',
    cancel: 'Annuler',
    rotate: 'Pivoter',
    lowConfidence: 'Confiance faible, à vérifier',
    centerMismatch: 'Le centre indique {x}, cette face devrait être {f} — vérifiez l\u2019orientation',
    cameraDenied: 'Caméra indisponible, utilisez le téléversement d\u2019image',
    notRecognized: 'Grille 3×3 incomplète. Visez bien une face, avec un éclairage uniforme, puis réessayez',
  },
```

es:
```ts
  scan: {
    open: 'Escanear una cara',
    title: 'Escanear los colores del cubo',
    capture: 'Capturar',
    upload: 'Subir imagen',
    retake: 'Repetir',
    confirm: 'Rellenar',
    cancel: 'Cancelar',
    rotate: 'Girar',
    lowConfidence: 'Baja confianza, verifique',
    centerMismatch: 'El centro lee {x}, esta cara debería ser {f} — comprueba la orientación',
    cameraDenied: 'Cámara no disponible, usa la subida de imagen',
    notRecognized: 'No se detectó una cuadrícula 3×3 completa. Apunta de frente, con luz uniforme, y reintenta',
  },
```

ru:
```ts
  scan: {
    open: 'Сканировать грань',
    title: 'Сканирование цветов куба',
    capture: 'Снимок',
    upload: 'Загрузить изображение',
    retake: 'Переснять',
    confirm: 'Заполнить',
    cancel: 'Отмена',
    rotate: 'Повернуть',
    lowConfidence: 'Низкая уверенность, проверьте',
    centerMismatch: 'Центр определялся как {x}, эта грань должна быть {f} — проверьте ориентацию',
    cameraDenied: 'Камера недоступна, загрузите изображение',
    notRecognized: 'Полная сетка 3×3 не найдена. Наведите строго на грань при ровном освещении и повторите',
  },
```

ar:
```ts
  scan: {
    open: 'امسح الوجه',
    title: 'مسح ألوان المكعب',
    capture: 'التقاط',
    upload: 'تحميل صورة',
    retake: 'إعادة الالتقاط',
    confirm: 'تعبئة',
    cancel: 'إلغاء',
    rotate: 'تدوير',
    lowConfidence: 'ثقة منخفضة، يرجى التحقق',
    centerMismatch: 'المركز يبدو {x}، هذا الوجه يجب أن يكون {f} — تحقق من الاتجاه',
    cameraDenied: 'الكاميرا غير متاحة، استخدم تحميل صورة',
    notRecognized: 'لم يتم العثور على شبكة 3×3 كاملة. وجّه الكاميرا نحو الوجه مباشرة بإضاءة متساوية وأعد المحاولة',
  },
```

- [ ] **Step 3: 全量回归 + 提交**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS（所有语言文件满足 `Dict`，缺键会在 tsc 报错——这正是本任务的验收）

```bash
git add src/i18n/
git commit -m "feat(scan): i18n keys for scanner UI (6 locales)"
git push
```

---

### Task 8: 图像输入适配层 `src/lib/scan/capture.ts`（随组件任务交付，无单测）

**Files:**
- Create: `src/lib/scan/capture.ts`

**Interfaces:**
- Consumes: 无
- Produces: `SCAN_MAX_EDGE = 384`、`grabVideoFrame(video: HTMLVideoElement): ImageData`、`imageDataFromFile(file: File): Promise<ImageData>` — Task 9 依赖。

**为何无单测**：jsdom 无真实 canvas 实现（`getContext` 返回 null），缩放/取帧逻辑是 3 行 DOM 胶水；由 Task 9 的组件测试（mock 本模块）与构建覆盖。

- [ ] **Step 1: 实现**

```ts
// src/lib/scan/capture.ts
export const SCAN_MAX_EDGE = 384

function imageDataFromSource(src: CanvasImageSource, w: number, h: number): ImageData {
  const scale = Math.min(1, SCAN_MAX_EDGE / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(src, 0, 0, cw, ch)
  return ctx.getImageData(0, 0, cw, ch)
}

export function grabVideoFrame(video: HTMLVideoElement): ImageData {
  return imageDataFromSource(video, video.videoWidth, video.videoHeight)
}

export function imageDataFromFile(file: File): Promise<ImageData> {
  return createImageBitmap(file).then(bmp => {
    const d = imageDataFromSource(bmp, bmp.width, bmp.height)
    bmp.close()
    return d
  })
}
```

- [ ] **Step 2: 构建验证 + 提交**

Run: `npx tsc --noEmit`

```bash
git add src/lib/scan/capture.ts
git commit -m "feat(scan): camera/file image capture adapter"
git push
```

---

### Task 9: ScannerOverlay 组件 + 样式 + Paint 集成

**Files:**
- Create: `src/components/ScannerOverlay.tsx`
- Create: `src/components/ScannerOverlay.test.tsx`
- Modify: `src/routes/Paint.tsx`（按钮 + 挂载）
- Modify: `src/styles.css`（追加 scanner 样式块）
- Test: `src/routes/Paint.test.tsx`（追加用例）

**Interfaces:**
- Consumes: `scanFace`/`ScanResult`/`ScanCell`（Task 5）、`grabVideoFrame`/`imageDataFromFile`（Task 8）、`setFace`（Task 6）、`t.scan.*`（Task 7）、`COLOR_HEX`/`COLOR_ORDER`（Task 1）、`CENTERS`（`src/lib/cube.ts` 已有）、`Face`/`Color` 类型。
- Produces: `ScannerOverlay({ face, onConfirm, onClose })`；确认时回调 `onConfirm(colors9)`（屏幕方向 9 色数组，index 4 传 `null` 占位由 setFace 忽略）。

- [ ] **Step 1: 写失败测试**

```tsx
// src/components/ScannerOverlay.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../i18n'   // 与其他组件测试相同的包裹方式
import type { Color } from '../types'
import type { ScanResult } from '../lib/scan/pipeline'

const scanFace = vi.fn()
vi.mock('../lib/scan/pipeline', () => ({ scanFace: (...a: unknown[]) => scanFace(...a) }))
vi.mock('../lib/scan/capture', () => ({
  grabVideoFrame: () => { throw new Error('no video in jsdom') },
  imageDataFromFile: () => Promise.resolve(new ImageData(8, 8)),
}))

const OK: ScanResult = {
  ok: true,
  center: 'W',
  cells: (['W','O','G','R','B','Y','G','W','R'] as Color[]).map(c => ({ color: c, confidence: 1, low: false })),
}

function mount(onConfirm = vi.fn(), face: 'U' | 'D' = 'U') {
  const onClose = vi.fn()
  render(
    <I18nProvider>
      <ScannerOverlay face={face} onConfirm={onConfirm} onClose={onClose} />
    </I18nProvider>,
  )
  return { onConfirm, onClose }
}

beforeEach(() => scanFace.mockReset())

describe('ScannerOverlay', () => {
  it('falls back to upload mode when camera is unavailable (jsdom)', async () => {
    mount()
    expect(await screen.findByText(/上传图片|Upload image/)).toBeTruthy()
  })

  it('upload → scan → preview renders 9 colored cells → confirm calls setFace payload', async () => {
    scanFace.mockReturnValue(OK)
    const { onConfirm } = mount()
    const input = await screen.findByTestId('scan-file')
    const file = new File(['x'], 'c.jpg', { type: 'image/jpeg' })
    await act(async () => { await input.files ? null : null })
    Object.defineProperty(input, 'files', { value: [file] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await waitFor(() => expect(scanFace).toHaveBeenCalled())
    await screen.findByTestId('scan-grid')
    // 中心格与 U 面一致（W）→ 无警示
    expect(screen.queryByTestId('scan-warn')).toBeNull()
    await act(async () => { screen.getByTestId('scan-confirm').click() })
    expect(onConfirm).toHaveBeenCalledWith(['W','O','G','R',null,'Y','G','W','R'])
  })

  it('center mismatch against the target face shows the warning', async () => {
    scanFace.mockReturnValue({ ...OK, center: 'Y' })
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await waitFor(() => expect(screen.getByTestId('scan-warn')).toBeTruthy())
  })

  it('failed detection shows guidance and retake', async () => {
    scanFace.mockReturnValue({ ok: false, reason: 'blobs' })
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await waitFor(() => expect(screen.getByTestId('scan-error')).toBeTruthy())
    expect(screen.getByTestId('scan-retake')).toBeTruthy()
  })

  it('rotate button cycles the preview grid orientation', async () => {
    scanFace.mockReturnValue(OK)
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await screen.findByTestId('scan-grid')
    const before = screen.getByTestId('scan-grid').textContent
    await act(async () => { screen.getByTestId('scan-rotate').click() })
    expect(screen.getByTestId('scan-grid').textContent).not.toBe(before)
  })
})
```

注意：若 `I18nProvider` 的实际导出名/包裹方式不同（先看 `src/i18n/index.tsx` 与现有组件测试的写法），以现有写法为准——测试文件顶部包裹代码与仓库现有组件测试保持一致。文件输入的 `change` 触发方式如与仓库已有的文件上传测试模式冲突，以现有模式为准。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/ScannerOverlay.test.tsx`
Expected: FAIL（组件不存在）

- [ ] **Step 3: 实现 `src/components/ScannerOverlay.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { COLOR_HEX, COLOR_ORDER } from '../lib/colors'
import { CENTERS } from '../lib/cube'
import { grabVideoFrame, imageDataFromFile } from '../lib/scan/capture'
import { scanFace, type ScanResult, type ScanCell } from '../lib/scan/pipeline'
import type { Color, Face } from '../types'

const FACE_NAME: Record<Face, string> = { U: '白', D: '黄', L: '橙', R: '红', F: '绿', B: '蓝' }
const COLOR_NAME: Record<Color, string> = { W: '白', Y: '黄', R: '红', O: '橙', G: '绿', B: '蓝' }

// 顺时针旋转 3×3 一次
function rot90<T>(g: T[][]): T[][] {
  return [0, 1, 2].map(c => [0, 1, 2].map(r => g[2 - r][c]))
}

export function ScannerOverlay({ face, onConfirm, onClose }: {
  face: Face
  onConfirm(colors: (Color | null)[]): void
  onClose(): void
}) {
  const { t, locale } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraDenied, setCameraDenied] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [rot, setRot] = useState(0)
  const [fixing, setFixing] = useState<number | null>(null)
  const [overrides, setOverrides] = useState<Record<number, Color>>({})

  useEffect(() => {
    let dead = false
    const md = navigator.mediaDevices
    if (!md?.getUserMedia) { setCameraDenied(true); return }
    md.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
      if (dead) { stream.getTracks().forEach(tr => tr.stop()); return }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    }).catch(() => { if (!dead) setCameraDenied(true) })
    return () => { dead = true; streamRef.current?.getTracks().forEach(tr => tr.stop()) }
  }, [])

  const runScan = useCallback((img: ImageData) => {
    setResult(scanFace(img))
    setRot(0); setFixing(null); setOverrides({})
  }, [])

  const onCapture = () => {
    const v = videoRef.current
    if (v && v.videoWidth > 0) runScan(grabVideoFrame(v))
  }
  const onFile = (f: File | undefined) => { if (f) imageDataFromFile(f).then(runScan).catch(() => {}) }

  const cells: (ScanCell | null)[][] = result?.ok
    ? Array.from({ length: rot }, () => 0).reduce<ScanCell[][]>(g => rot90(g), result.cells)
    : []
  const flat = cells.flat()
  const centerColor = result?.ok ? result.cells[1][1].color : null
  const mismatch = centerColor !== null && centerColor !== CENTERS[face]
  const complete = result?.ok === true && flat.every(c => c !== null)
  const L = locale === 'zh' ? FACE_NAME : null // 面名按语言简单处理，见 Step 4 备注

  const confirm = () => {
    if (!complete) return
    onConfirm(flat.map((c, i) => (i === 4 ? null : overrides[i] ?? c!.color)))
  }

  return (
    <div className="scanner-overlay" role="dialog">
      <div className="scanner-panel">
        <h2>{t.scan.title}</h2>
        <button className="scanner-close" aria-label={t.scan.cancel} onClick={onClose}>✕</button>
        {!result && (
          <div className="scanner-live">
            {!cameraDenied ? (
              <>
                {/* iOS 真机加固 #3：playsInline/muted/autoPlay 缺一不可 */}
                <video ref={videoRef} playsInline muted autoPlay data-testid="scan-video" />
                <div className="scanner-actions">
                  <button className="solve-link" onClick={onCapture}>{t.scan.capture}</button>
                  <label className="solve-link">
                    {t.scan.upload}
                    <input type="file" accept="image/*" data-testid="scan-file" hidden
                      onChange={e => onFile(e.target.files?.[0])} />
                  </label>
                </div>
              </>
            ) : (
              <p className="scan-warn" data-testid="scan-camera-denied">{t.scan.cameraDenied}</p>
            )}
            {cameraDenied && (
              <label className="solve-link">
                {t.scan.upload}
                <input type="file" accept="image/*" data-testid="scan-file" hidden
                  onChange={e => onFile(e.target.files?.[0])} />
              </label>
            )}
          </div>
        )}
        {result && !result.ok && (
          <div>
            <p className="scan-warn" data-testid="scan-error">{t.scan.notRecognized}</p>
            <div className="scanner-actions">
              <button className="solve-link" data-testid="scan-retake" onClick={() => setResult(null)}>{t.scan.retake}</button>
            </div>
          </div>
        )}
        {result?.ok && (
          <div>
            {mismatch && (
              <p className="scan-warn" data-testid="scan-warn">
                {t.scan.centerMismatch
                  .replace('{x}', COLOR_NAME[centerColor as Color])
                  .replace('{f}', FACE_NAME[face])}
              </p>
            )}
            <div className="scan-grid" data-testid="scan-grid">
              {cells.map((row, r) => row.map((cell, c) => {
                const i = r * 3 + c
                const color = overrides[i] ?? cell?.color ?? null
                return (
                  <button key={i} data-testid={`scan-cell-${i}`}
                    className={'scan-cell' + (cell?.low ? ' low' : '')}
                    style={{ background: color ? COLOR_HEX[color] : 'transparent' }}
                    onClick={() => setFixing(i)} />
                )
              }))}
            </div>
            {fixing !== null && (
              <div className="scan-fix" data-testid="scan-fix">
                {COLOR_ORDER.map(col => (
                  <button key={col} className="chip" data-color={col}
                    style={{ background: COLOR_HEX[col] }}
                    onClick={() => { setOverrides(o => ({ ...o, [fixing]: col })); setFixing(null) }} />
                ))}
              </div>
            )}
            <div className="scanner-actions">
              <button className="solve-link" data-testid="scan-rotate" onClick={() => setRot(r => (r + 1) % 4)}>{t.scan.rotate}</button>
              <button className="solve-link" data-testid="scan-retake" onClick={() => setResult(null)}>{t.scan.retake}</button>
              <button className="solve-link" data-testid="scan-confirm" disabled={!complete} onClick={confirm}>{t.scan.confirm}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 4 备注（实现时确认两点）**：
1. `useI18n()` 的返回形状以 `src/i18n/index.tsx` 为准（若含 `locale` 则直接用；否则删掉 `L` 变量，`FACE_NAME`/`COLOR_NAME` 直接用中文——中文是默认语言，其他语言面名用 `CENTERS` 对应的 COLOR_NAME 英文字母或沿用 `t` 已有词，**以最简实现交付，不新增 i18n 键**）。
2. `cameraDenied` 且无 `<video>` 时，上传 label 必须渲染（上面代码已处理）——这是 jsdom 测试路径。

- [ ] **Step 4b: `src/styles.css` 追加**

```css
/* ---- Scanner overlay ---- */
.scanner-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 50; display: flex; align-items: center; justify-content: center; }
.scanner-panel { position: relative; background: var(--panel, #1c1c22); color: var(--text, #eee); border-radius: 14px; padding: 18px; width: min(92vw, 420px); display: flex; flex-direction: column; gap: 12px; }
.scanner-close { position: absolute; top: 10px; right: 10px; background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; }
.scanner-panel video { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; background: #000; }
.scanner-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.scan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.scan-cell { aspect-ratio: 1; border-radius: 8px; border: 2px solid rgba(255,255,255,.25); cursor: pointer; }
.scan-cell.low { border-color: #ff5252; }
.scan-warn { background: #4a3b12; color: #ffd54f; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.scan-fix { display: flex; gap: 8px; justify-content: center; }
.scan-fix .chip { width: 36px; height: 36px; }
```

（若 `styles.css` 已有 `--panel`/`--text` 变量名不同，用文件里实际存在的变量或字面色。）

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run src/components/ScannerOverlay.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Paint 集成 + 失败测试先行**

`src/routes/Paint.test.tsx` 追加用例（跟随该文件现有渲染/查询模式）：

```tsx
it('scan button opens the scanner overlay', () => {
  renderPaint()
  act(() => { screen.getByText('拍照识别').click() })
  expect(screen.getByText('拍照识别色块')).toBeTruthy()
})
```

（`renderPaint` 换成该文件实际已有的 render 辅助；文案断言用 `t.scan.title` zh 值。）

先跑：`npx vitest run src/routes/Paint.test.tsx` → FAIL，然后 `Paint.tsx` 修改：

```tsx
import { useState } from 'react'
// ...现有 imports
import { ScannerOverlay } from '../components/ScannerOverlay'

export default function Paint() {
  // ...现有 hooks
  const [scanning, setScanning] = useState(false)
  const { setFace, /* ...现有解构新增 setFace */ } = useApp()
  return (
    <div className="app paint">
      {/* ...现有结构，Palette 之后插入： */}
      <button className="reset-btn" onClick={() => setScanning(true)}>{t.scan.open}</button>
      {scanning && (
        <ScannerOverlay face={orientation === 'default' ? 'U' : 'D'}
          onConfirm={colors => { setFace(orientation === 'default' ? 'U' : 'D', colors); setScanning(false) }}
          onClose={() => setScanning(false)} />
      )}
      {/* ...其余不变 */}
    </div>
  )
}
```

**说明**：当前应用只有 default/flipped 两个朝向（U/D 互翻），扫描目标面 = 当前朝向对应的面；其余面用户翻面后扫。该映射在实现时与 `FlipButton`/`Cube` 的朝向语义核对，若有出入以现有语义为准调整三元表达式。

- [ ] **Step 7: 全量回归 + 构建 + 提交**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全部 PASS；bundle 无新增三方依赖体积

```bash
git add src/components/ScannerOverlay.tsx src/components/ScannerOverlay.test.tsx src/routes/Paint.tsx src/routes/Paint.test.tsx src/styles.css
git commit -m "feat(scan): ScannerOverlay UI + paint-page integration"
git push
```

---

## Self-Review 记录

1. **Spec 覆盖**：capture（Task 8 + iOS 属性在 Task 9）、segment（Task 3）、geometry+符号锚定（Task 4）、classify+白色预判（Task 2）、核对/修正/旋转/警示 UI（Task 9）、setFace（Task 6）、i18n 6 语言（Task 7）、Detector 接口预留（spec 定位为"将来"，本计划不改现有 API，`scanFace` 即接缝）✓
2. **占位符扫描**：Task 9 的 Step 1/Step 4 有两处"以现有代码为准"的锚点（I18nProvider 包裹方式、朝向语义），属对接现有代码的确认点而非空实现；其余全部给出实代码 ✓
3. **类型一致性**：`ScanResult`/`ScanCell`/`Blob`/`ClassifyResult`/`DetectResult`/`GridResult` 在定义任务与消费任务间逐一核对一致；`onConfirm(colors9)` 与 `setFace(face, colors9)` 签名一致（index 4 由 confirm 侧置 null）✓
