import type { Color, Face, CubeState, Orientation } from '../types'

export const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
// 拍色枢纽的槽位顺序（用户实测的滚动路径）：第一排 白/红/蓝（U/R/B），
// 第二排 黄/绿/橙（D/F/L）。按此顺序拍摄，相邻两面恰好只需单次 90° 滚动即可
// 拍全六面（见 cube.test.ts 的滚动路径校验）。也用于「下一个待拍面」的自动预选。
export const SCAN_FACE_ORDER: Face[] = ['U', 'R', 'B', 'D', 'F', 'L']
export const COLORS: Color[] = ['W', 'R', 'O', 'Y', 'G', 'B']

// Fixed color scheme — standard Western: opposite pairs are White↔Yellow,
// Orange↔Red, Green↔Blue. Green is FRONT (F) and Red is RIGHT (R) so that the
// default corner-on view (U/L/F) shows three MUTUALLY ADJACENT faces:
// white top, orange left, green right (req 4). The flipped view shows the
// opposite corner D/B/R: yellow / blue / red (req 5).
export const CENTERS: Record<Face, Color> = { U: 'W', D: 'Y', L: 'O', R: 'R', F: 'G', B: 'B' }

// Face-on viewing orientation per face (Singmaster convention): which face's
// center borders each edge of face F when viewed head-on in the orientation
// implied by the facelet indexing (0,1,2 = top row). Derived from and verified
// against solver.ts toCubies corner/edge groupings — see cube.test.ts.
export const ADJACENT: Record<Face, { up: Face; right: Face; down: Face; left: Face }> = {
  U: { up: 'B', right: 'R', down: 'F', left: 'L' },
  D: { up: 'F', right: 'R', down: 'B', left: 'L' },
  F: { up: 'U', right: 'R', down: 'D', left: 'L' },
  B: { up: 'U', right: 'L', down: 'D', left: 'R' },
  L: { up: 'U', right: 'F', down: 'D', left: 'B' },
  R: { up: 'U', right: 'B', down: 'D', left: 'F' },
}

// 扫描时的正面视角：按 SCAN_FACE_ORDER 单次滚动拍摄时，相机所见的四边邻面。
// 与 ADJACENT（标准朝向，绑定 cubie.ts 面片索引）不同——这里描述用户实际握持
// 朝向；写入仓库前需按 SCAN_ROT 把采样格旋回标准朝向。
export const SCAN_VIEW: Record<Face, { up: Face; right: Face; down: Face; left: Face }> = {
  U: { up: 'B', right: 'R', down: 'F', left: 'L' },
  R: { up: 'B', right: 'D', down: 'F', left: 'U' },
  B: { up: 'L', right: 'D', down: 'R', left: 'U' },
  D: { up: 'L', right: 'F', down: 'R', left: 'B' },
  F: { up: 'L', right: 'U', down: 'R', left: 'D' },
  L: { up: 'B', right: 'U', down: 'F', left: 'D' },
}

// 采样格 → 标准（ADJACENT）布局需要顺时针旋转的 90° 次数（0..3）
export const SCAN_ROT: Record<Face, number> = { U: 0, R: 1, B: 1, D: 3, F: 3, L: 3 }

// 把 3×3 平铺数组顺时针旋转 turns 个 90°（turns 归一化到 0..3）
export function rotateFlat<T>(cells: T[], turns: number): T[] {
  const t = ((turns % 4) + 4) % 4
  let out = cells.slice()
  for (let n = 0; n < t; n++) {
    const prev = out
    out = [6, 3, 0, 7, 4, 1, 8, 5, 2].map(i => prev[i])
  }
  return out
}

export function emptyCube(): CubeState {
  const c = {} as CubeState
  for (const f of FACES) {
    c[f] = Array<Color | null>(9).fill(null)
    c[f][4] = CENTERS[f]
  }
  return c
}

export function solvedCube(): CubeState {
  const c = {} as CubeState
  for (const f of FACES) c[f] = Array<Color | null>(9).fill(CENTERS[f])
  return c
}

export function cloneCube(c: CubeState): CubeState {
  const out = {} as CubeState
  for (const f of FACES) out[f] = c[f].slice()
  return out
}

export function isFull(c: CubeState): boolean {
  return FACES.every(f => c[f].every(x => x !== null))
}

export function remainingCounts(c: CubeState): Record<Color, number> {
  const placed: Record<Color, number> = { W: 0, R: 0, O: 0, Y: 0, G: 0, B: 0 }
  for (const f of FACES) {
    c[f].forEach((x, i) => { if (i !== 4 && x) placed[x] += 1 })
  }
  const out = {} as Record<Color, number>
  // 8 non-center stickers of each color remain to be placed; goes negative
  // (e.g. -1) when the user over-fills a color, as a visible warning.
  for (const col of COLORS) out[col] = 8 - placed[col]
  return out
}

export function visibleFaces(o: Orientation): { top: Face; left: Face; right: Face } {
  // Three MUTUALLY ADJACENT faces meeting at a corner (never opposite faces).
  // default = U/L/F corner (white / orange / green); flipped = the opposite
  // D/B/R corner (yellow / blue / red).
  return o === 'default'
    ? { top: 'U', left: 'L', right: 'F' }
    : { top: 'D', left: 'B', right: 'R' }
}
