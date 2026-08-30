import type { CubeState, Color, Face } from '../types'

// colors[] index order: +x,-x,+y,-y,+z,-z  =>  R,L,U,D,F,B
export const FACE_LABELS = ['R', 'L', 'U', 'D', 'F', 'B'] as const
type FaceLabel = typeof FACE_LABELS[number]
const labelIndex = (f: Face) => FACE_LABELS.indexOf(f as FaceLabel)

// Outward normal per face.
const FACE_AXES: Record<Face, [number, number, number]> = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
}

// facelet idx 0..8 → cubie position, per face. Derived from CORNER_FACELETS/
// EDGE_FACELETS (see plan header). Row 0 of each face is the row farther from
// the viewer in that face's oriented grid.
export const FACELET_POS: Record<Face, [number, number, number][]> = {
  U: [
    [-1,1,1],[0,1,1],[1,1,1],[-1,1,0],[0,1,0],[1,1,0],[-1,1,-1],[0,1,-1],[1,1,-1],
  ],
  D: [
    [-1,-1,-1],[0,-1,-1],[1,-1,-1],[-1,-1,0],[0,-1,0],[1,-1,0],[-1,-1,1],[0,-1,1],[1,-1,1],
  ],
  R: [
    [1,1,-1],[1,1,0],[1,1,1],[1,0,-1],[1,0,0],[1,0,1],[1,-1,-1],[1,-1,0],[1,-1,1],
  ],
  L: [
    [-1,1,1],[-1,1,0],[-1,1,-1],[-1,0,1],[-1,0,0],[-1,0,-1],[-1,-1,1],[-1,-1,0],[-1,-1,-1],
  ],
  F: [
    [-1,1,1],[0,1,1],[1,1,1],[-1,0,1],[0,0,1],[1,0,1],[-1,-1,1],[0,-1,1],[1,-1,1],
  ],
  B: [
    [1,1,-1],[0,1,-1],[-1,1,-1],[1,0,-1],[0,0,-1],[-1,0,-1],[1,-1,-1],[0,-1,-1],[-1,-1,-1],
  ],
}

export interface CubieColor { pos: [number, number, number]; colors: (Color | null)[] }

const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']

export function cubiesFromState(cube: CubeState): CubieColor[] {
  // Build position-keyed color map.
  const map = new Map<string, (Color | null)[]>()
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`
  const ensure = (p: [number, number, number]) => {
    const k = key(...p)
    let arr = map.get(k)
    if (!arr) { arr = new Array(6).fill(null); map.set(k, arr) }
    return arr
  }
  for (const f of FACES) {
    const li = labelIndex(f)
    for (let i = 0; i < 9; i++) {
      const pos = FACELET_POS[f][i]
      ensure(pos)[li] = cube[f][i]
    }
  }
  // Emit all 27 positions in a stable order (x then y then z).
  const out: CubieColor[] = []
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        out.push({ pos: [x, y, z], colors: map.get(key(x, y, z)) ?? new Array(6).fill(null) })
  return out
}
