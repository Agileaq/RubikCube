import type { Color, Face, CubeState, Orientation } from '../types'

export const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
// 拍色枢纽的槽位顺序（用户指定）：第一排 白/橙/绿（U/L/F，默认视角三面），
// 第二排 红/蓝/黄（R/B/D）。也用于「下一个待拍面」的自动预选顺序。
export const SCAN_FACE_ORDER: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']
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
