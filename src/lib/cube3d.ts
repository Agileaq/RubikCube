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
// ringArrowGeometry — per-face flow arrows on the turning layer's ring
// ---------------------------------------------------------------------------
// Replaces the floating face arc. Each of the turning layer's 4 side faces
// carries ONE purple arrow spanning that face's full 3-sticker row (the three
// filled blocks, corner-edge-corner), pointing along the layer's physical flow
// direction — 4 arrows forming a broken ring band. For double turns the shaft
// splits around the middle block and a purple "2" sits in the gap, integrated
// into the arrow. Everything derives from the engine's own rotation math
// (turnDirection / rotatePos / cross product) — never by mirroring one face's
// logic onto another.

export const GAP = 1.08 // cubie spacing (world units)

export interface RingBar {
  pos: [number, number, number]  // world center; axis-aligned box, no rotation
  dims: [number, number, number] // [x,y,z] extents — the long axis IS the flow axis
}
export interface RingWing extends RingBar {
  rot: [number, number, number]  // single-component euler about the face normal
}
export interface RingBadge {
  pos: [number, number, number]
  rot: [number, number, number]  // orients troika Text flat on the face, upright
}
export interface RingArrowGeometry {
  bars: RingBar[]      // shafts: 1 per ring face (full row), 2 for double turns (gap houses the "2")
  wings: RingWing[]    // 2 chevron bars per ring face at the flow end of the row
  badges: RingBadge[]  // "2" on each middle block, double turns only
}

// cubie-local depth layers (sticker 0.51 < shaft 0.52–0.54 < wings/badge 0.55–0.57)
const BAR_OFF = 0.53    // shaft center above the cubie surface (0.02-thick box → 0.52..0.54)
const WING_OFF = 0.56   // chevron rides one layer above the shaft — no coplanar z-fight at the tip
const BADGE_OFF = 0.56  // "2" text plane, in the shaft gap, strictly above the sticker
const BADGE_GAP = 0.3   // half-width of the shaft gap housing the "2"
const BAR_W = 0.1       // bar width (in-face, across the flow)
const BAR_T = 0.02      // bar thickness (along the face normal)
const EXT = 1.45        // edge-center reach of shaft ends AND chevron tip — pulled in
                        // from the 1.62 corner tip so each arrow's head and the next
                        // arrow's tail keep a visible breathing gap at the corner
const WING_LEN = 0.45

// Ring edge the arrow starts on: shared with the face most visible from the
// default camera (sees U/L/F) — F-side edge for U/D turns, U-side edge otherwise.
const START_EDGE: Record<Face, [number, number, number]> = {
  U: [0, 1, 1],  // UF — side face F
  D: [0, -1, 1], // DF — side face F
  F: [0, 1, 1],  // UF — side face U
  B: [0, 1, -1], // UB — side face U
  R: [1, 1, 0],  // UR — side face U
  L: [-1, 1, 0], // UL — side face U
}

// Wrap direction = the layer's ACTUAL animated rotation (sign of the engine's
// quarterTurns): dir 1 → the face's clockwise, dir -1 → counter-clockwise, and
// dir 2 → +2 about +axis. Deriving from quarterTurns (not CW_SIGN) is what
// keeps a 180° arrow flowing the way the layer visibly turns — CW_SIGN alone
// inverts U2/F2/R2 relative to the animation.
const stepSign = (face: Face, dir: 1 | -1 | 2) =>
  turnDirection(face, dir).quarterTurns >= 0 ? 1 : -1

// Side-face normal of a ring edge cubie: the nonzero coordinate other than the
// layer axis (e.g. UF in the U ring → +z → its F face).
function sideNormal(p: [number, number, number], axis: Axis): [number, number, number] {
  const [x, y, z] = p
  if (axis === 'x') return y !== 0 ? [0, y, 0] : [0, 0, z]
  if (axis === 'y') return x !== 0 ? [x, 0, 0] : [0, 0, z]
  return x !== 0 ? [x, 0, 0] : [0, y, 0]
}

const cross = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const AXIS_UNIT: Record<Axis, [number, number, number]> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }

// Flow tangent at a ring edge: v = ω̂·step × r (rigid rotation velocity).
function flowTangent(p: [number, number, number], axis: Axis, step: number): [number, number, number] {
  const v = cross(AXIS_UNIT[axis], p)
  return [v[0] * step, v[1] * step, v[2] * step]
}

// World position of an element lying on edge cubie p's side face: cubie center
// pushed out along the normal, then shifted along the flow within the face.
function onFace(
  p: [number, number, number], n: [number, number, number],
  t: [number, number, number], along: number, off: number,
): [number, number, number] {
  return [0, 1, 2].map((i) => p[i] * GAP + n[i] * off + t[i] * along) as [number, number, number]
}

// Axis-aligned bar dims: length along the flow axis, width along n×t, thickness along n.
function barDims(t: [number, number, number], n: [number, number, number], len: number): [number, number, number] {
  const u = cross(n, t)
  const dims: [number, number, number] = [0, 0, 0]
  const put = (v: [number, number, number], d: number) => {
    const i = v.findIndex((c) => c !== 0)
    dims[i] = d
  }
  put(t, len); put(u, BAR_W); put(n, BAR_T)
  return dims
}

// Chevron wing shape: dims + single euler component about the face normal axis
// that swings the box's long axis onto the wing direction (boxes are π-symmetric).
// Branched on the face normal (the wing lies in the plane ⊥ n), never on w.
function wingShape(
  n: [number, number, number], w: [number, number, number], len: number,
): { dims: [number, number, number]; rot: [number, number, number] } {
  if (n[0] !== 0) return { dims: [BAR_T, BAR_W, len], rot: [Math.atan2(-w[1], w[2]), 0, 0] }
  if (n[1] !== 0) return { dims: [len, BAR_T, BAR_W], rot: [0, Math.atan2(-w[2], w[0]), 0] }
  return { dims: [len, BAR_W, BAR_T], rot: [0, 0, Math.atan2(w[1], w[0])] }
}

// Badge euler that faces troika Text along the side-face normal, upright.
const BADGE_ROT: Record<string, [number, number, number]> = {
  '0,0,1': [0, 0, 0], '0,0,-1': [0, Math.PI, 0],
  '1,0,0': [0, Math.PI / 2, 0], '-1,0,0': [0, -Math.PI / 2, 0],
  '0,1,0': [-Math.PI / 2, 0, 0], '0,-1,0': [Math.PI / 2, 0, 0],
}

export function ringArrowGeometry(face: Face, dir: 1 | -1 | 2): RingArrowGeometry {
  const axis = layerAxis(face)
  const step = stepSign(face, dir)

  // The ring's 4 edge cubies, walked in flow order from the camera-facing
  // start edge. Each gets its own arrow on its side face.
  const edges: [number, number, number][] = []
  let p = START_EDGE[face]
  for (let i = 0; i < 4; i++) {
    edges.push(p)
    p = rotatePos(p, axis, step)
  }

  const bars: RingBar[] = []
  const wings: RingWing[] = []
  const badges: RingBadge[] = []
  const A = Math.PI * 3 / 4 // 135°
  for (const e of edges) {
    const n = sideNormal(e, axis)
    const t = flowTangent(e, axis, step)

    // Shaft across the face's full 3-sticker row (corner to corner). Double
    // turns split it around the middle block, housing the integrated "2".
    const segs: [number, number][] = dir === 2
      ? [[-EXT, -BADGE_GAP], [BADGE_GAP, EXT]]
      : [[-EXT, EXT]]
    for (const [a, b] of segs) {
      bars.push({ pos: onFace(e, n, t, (a + b) / 2, BAR_OFF), dims: barDims(t, n, b - a) })
    }

    // Chevron head at the row's flow end, riding one layer above the shaft so
    // the crossing at the tip never z-fights.
    const tip = onFace(e, n, t, EXT, WING_OFF)
    const u = cross(n, t)
    for (const s of [1, -1] as const) {
      // wing direction: flow rotated ±135° in the face plane (tip points along t)
      const w: [number, number, number] = [
        t[0] * Math.cos(A) + u[0] * s * Math.sin(A),
        t[1] * Math.cos(A) + u[1] * s * Math.sin(A),
        t[2] * Math.cos(A) + u[2] * s * Math.sin(A),
      ]
      const shape = wingShape(n, w, WING_LEN)
      wings.push({
        pos: [0, 1, 2].map((i) => tip[i] + w[i] * (WING_LEN / 2)) as [number, number, number],
        dims: shape.dims,
        rot: shape.rot,
      })
    }

    // Purple "2" in the shaft gap, on the middle block's sticker (double turns).
    if (dir === 2) {
      badges.push({ pos: onFace(e, n, t, 0, BADGE_OFF), rot: BADGE_ROT[n.join(',')] })
    }
  }

  return { bars, wings, badges }
}
