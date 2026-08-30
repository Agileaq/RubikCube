import type { Color, Face, CubeState, Orientation } from '../types'

export const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
export const COLORS: Color[] = ['W', 'R', 'O', 'Y', 'G', 'B']

// Fixed color scheme — standard Western: opposite pairs are White↔Yellow,
// Orange↔Red, Green↔Blue. Green is FRONT (F) and Red is RIGHT (R) so that the
// default corner-on view (U/L/F) shows three MUTUALLY ADJACENT faces:
// white top, orange left, green right (req 4). The flipped view shows the
// opposite corner D/B/R: yellow / blue / red (req 5).
export const CENTERS: Record<Face, Color> = { U: 'W', D: 'Y', L: 'O', R: 'R', F: 'G', B: 'B' }

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
