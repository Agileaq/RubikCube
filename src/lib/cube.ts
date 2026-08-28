import type { Color, Face, CubeState, Orientation } from '../types'

export const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
export const COLORS: Color[] = ['W', 'R', 'O', 'Y', 'G', 'B']

// Fixed color scheme. U/L/R chosen so default view shows W/O/G (req 4);
// D/B/F carry Y/B/R so the flipped view shows Y/B/R (req 5).
export const CENTERS: Record<Face, Color> = { U: 'W', D: 'Y', L: 'O', R: 'G', F: 'R', B: 'B' }

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
  for (const col of COLORS) out[col] = Math.max(0, 8 - placed[col])
  return out
}

export function visibleFaces(o: Orientation): { top: Face; left: Face; right: Face } {
  return o === 'default'
    ? { top: 'U', left: 'L', right: 'R' }
    : { top: 'D', left: 'B', right: 'F' }
}
