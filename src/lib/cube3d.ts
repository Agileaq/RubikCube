import type { CubeState, Color, Face } from '../types'
import { CORNER_FACELETS, EDGE_FACELETS } from './cubie'

// colors[] index order: +x,-x,+y,-y,+z,-z  =>  R,L,U,D,F,B
export const FACE_LABELS = ['R', 'L', 'U', 'D', 'F', 'B'] as const
type FaceLabel = typeof FACE_LABELS[number]
const labelIndex = (f: Face) => FACE_LABELS.indexOf(f as FaceLabel)

// Canonical 3D positions of the 8 corners and 12 edges, right-handed coords
// (x=+1 Right / -1 Left, y=+1 Up / -1 Down, z=+1 Front / -1 Back). These mirror
// the order used by `cubie.ts`'s CORNER_FACELETS / EDGE_FACELETS so a facelet's
// position is ground-truth-derived, not guessed.
const CORNER_POS: [number, number, number][] = [
  [ 1, 1, 1], // 0 URF  (+x +y +z)
  [-1, 1, 1], // 1 UFL  (-x +y +z)
  [-1, 1,-1], // 2 ULB  (-x +y -z)
  [ 1, 1,-1], // 3 UBR  (+x +y -z)
  [ 1,-1, 1], // 4 DFR  (+x -y +z)
  [-1,-1, 1], // 5 DLF  (-x -y +z)
  [-1,-1,-1], // 6 DBL  (-x -y -z)
  [ 1,-1,-1], // 7 DRB  (+x -y -z)
]
const EDGE_POS: [number, number, number][] = [
  [ 1, 1, 0], // 0 UR
  [ 0, 1, 1], // 1 UF
  [-1, 1, 0], // 2 UL
  [ 0, 1,-1], // 3 UB
  [ 1,-1, 0], // 4 DR
  [ 0,-1, 1], // 5 DF
  [-1,-1, 0], // 6 DL
  [ 0,-1,-1], // 7 DB
  [ 1, 0, 1], // 8 FR
  [-1, 0, 1], // 9 FL
  [-1, 0,-1], // 10 BL
  [ 1, 0,-1], // 11 BR
]

// Outward normal per face.
const FACE_NORMAL: Record<Face, [number, number, number]> = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
}
const CENTER_POS: Record<Face, [number, number, number]> = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
}

const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']

// facelet idx 0..8 → cubie position, per face. Built from CORNER_FACELETS /
// EDGE_FACELETS + face centers: each corner's 3 facelets get that corner's
// CORNER_POS, each edge's 2 facelets get that edge's EDGE_POS, and facelet 4 of
// each face gets the face-center position. ZERO guessing — the table is the
// engine's own cubie membership projected into 3D.
export const FACELET_POS: Record<Face, [number, number, number][]> = (() => {
  const table = {} as Record<Face, [number, number, number][]>
  for (const f of FACES) table[f] = new Array(9).fill(null) as [number, number, number][]
  for (const f of FACES) table[f][4] = CENTER_POS[f]
  CORNER_FACELETS.forEach((facelets, ci) => {
    for (const [f, i] of facelets) table[f][i] = CORNER_POS[ci]
  })
  EDGE_FACELETS.forEach((facelets, ei) => {
    for (const [f, i] of facelets) table[f][i] = EDGE_POS[ei]
  })
  return table
})()

export interface CubieColor { pos: [number, number, number]; colors: (Color | null)[] }

export function cubiesFromState(cube: CubeState): CubieColor[] {
  // Build position-keyed color map: each facelet writes its color into the
  // face's slot of the cubie sitting at FACELET_POS[face][i].
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

// ---------------------------------------------------------------------------
// Layer geometry + applyLayerTurn (Task 2)
// ---------------------------------------------------------------------------

type Axis = 'x' | 'y' | 'z'

// axis perpendicular to the face's layer.
export function layerAxis(face: Face): Axis {
  return face === 'U' || face === 'D' ? 'y' : face === 'R' || face === 'L' ? 'x' : 'z'
}

const axisIndex = (a: Axis): 0 | 1 | 2 => (a === 'x' ? 0 : a === 'y' ? 1 : 2)

// The 9 cubie positions of the layer the engine turns for `face`: the layer's
// coordinate on layerAxis equals the face's outward-normal sign.
export function layerPositions(face: Face): [number, number, number][] {
  const a = layerAxis(face)
  const ai = axisIndex(a)
  const coord = FACE_NORMAL[face][ai]
  const out: [number, number, number][] = []
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const p: [number, number, number] = [x, y, z]
        if (p[ai] === coord) out.push(p)
      }
  return out
}

// dir=1 quarter-turn sign (right-handed about +axis). Verified against the
// scrambled round-trip gate; uniform, no per-face hacks.
const CW_SIGN: Record<Face, number> = { U: -1, D: 1, R: -1, L: 1, F: -1, B: 1 }

export function turnDirection(face: Face, dir: 1 | -1 | 2): { axis: Axis; quarterTurns: number } {
  const axis = layerAxis(face)
  let q = CW_SIGN[face]
  if (dir === -1) q = -q
  if (dir === 2) q = 2
  return { axis, quarterTurns: q }
}

const COS = [1, 0, -1, 0]
const SIN = [0, 1, 0, -1]

// Integer 90° right-handed rotation about +axis.
export function rotatePos(pos: [number, number, number], axis: Axis, quarterTurns: number): [number, number, number] {
  const m = ((quarterTurns % 4) + 4) % 4
  const c = COS[m], s = SIN[m]
  const [x, y, z] = pos
  if (axis === 'x') return [x, c * y - s * z, s * y + c * z]
  if (axis === 'y') return [c * x + s * z, y, -s * x + c * z]
  return [c * x - s * y, s * x + c * y, z]
}

// The 6 face-slots (+x,-x,+y,-y,+z,-z) as direction vectors, in colors[] order.
const SLOT_VEC: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
]
const vecKey = (v: [number, number, number]) => `${v[0]},${v[1]},${v[2]}`
const SLOT_BY_VEC: Record<string, number> = Object.fromEntries(
  SLOT_VEC.map((v, i) => [vecKey(v), i]),
)

// Permute the 6 face-slots under the same spatial rotation as rotatePos: a
// destination slot receives whatever was in the source slot that rotates onto
// it. (i.e. the +y slot now holds what was in +z after a +x rotation, etc.)
function rotateColors(colors: (Color | null)[], axis: Axis, quarterTurns: number): (Color | null)[] {
  const out: (Color | null)[] = new Array(6).fill(null)
  for (let s = 0; s < 6; s++) {
    const dv = rotatePos(SLOT_VEC[s], axis, quarterTurns)
    const d = SLOT_BY_VEC[vecKey(dv)]
    out[d] = colors[s]
  }
  return out
}

// Pure commit: rotate the 9 layer cubies' positions and color-slot arrays,
// re-project to facelets. Equals applyMove(cube, {face, dir}) on scrambled cubes.
export function applyLayerTurn(cube: CubeState, face: Face, dir: 1 | -1 | 2): CubeState {
  const { axis, quarterTurns } = turnDirection(face, dir)
  // Position → colors map from the incoming cube.
  const cubies = new Map<string, (Color | null)[]>()
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`
  const ensure = (p: [number, number, number]) => {
    const k = key(...p)
    let arr = cubies.get(k)
    if (!arr) { arr = new Array(6).fill(null); cubies.set(k, arr) }
    return arr
  }
  for (const f of FACES) {
    const li = labelIndex(f)
    for (let i = 0; i < 9; i++) ensure(FACELET_POS[f][i])[li] = cube[f][i]
  }

  // Rotate the 9 layer cubies; copy the rest through unchanged.
  const layer = layerPositions(face)
  const layerSet = new Set(layer.map(p => key(...p)))
  const next = new Map<string, (Color | null)[]>()
  for (const [k, colors] of cubies) {
    if (layerSet.has(k)) {
      const p = k.split(',').map(Number) as [number, number, number]
      const np = rotatePos(p, axis, quarterTurns)
      next.set(key(...np), rotateColors(colors, axis, quarterTurns))
    } else {
      next.set(k, colors.slice())
    }
  }

  // Re-project to facelets.
  const out = {} as CubeState
  for (const f of FACES) out[f] = new Array(9).fill(null)
  for (const f of FACES) {
    const li = labelIndex(f)
    for (let i = 0; i < 9; i++) {
      const p = FACELET_POS[f][i]
      const cols = next.get(key(...p))
      out[f][i] = cols ? cols[li] : null
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// arrowSpec (Task 3)
// ---------------------------------------------------------------------------

export interface ArrowSpec {
  face: Face
  axis: Axis
  sign: 1 | -1
  sweep: 1 | 2
  visualDir: 'cw' | 'ccw'
  double: boolean
}

export function arrowSpec(face: Face, dir: 1 | -1 | 2): ArrowSpec {
  const axis = layerAxis(face)
  const ai = axisIndex(axis)
  const sign = (FACE_NORMAL[face][ai] >= 0 ? 1 : -1) as 1 | -1
  const { quarterTurns } = turnDirection(face, dir)
  const sweep = (Math.abs(quarterTurns) === 2 ? 2 : 1) as 1 | 2
  const visualDir = quarterTurns > 0 ? 'cw' : 'ccw'
  return { face, axis, sign, sweep, visualDir, double: dir === 2 }
}
