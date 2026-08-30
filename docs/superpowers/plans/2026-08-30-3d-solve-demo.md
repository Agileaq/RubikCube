# 3D 复原演示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Solve route's static 2.5D step display with a real 3D (three.js + R3F) cube that animates each layer turn, shows a direction arrow on the turning face, and plays at a user-adjustable 1–5s/step speed.

**Architecture:** A pure, fully-TDD'd `src/lib/cube3d.ts` maps `CubeState` ↔ 27 cubies (position + 6 face colors) and encodes per-face layer rotation (axis + signed angle) plus the arrow spec — no `three` import, so it tests in jsdom. `src/components/Cube3D.tsx` (R3F) consumes it: renders 27 cubies, animates the active layer by grouping its 9 cubies and rotating the group to exactly 90°/180° (so it ends grid-aligned), then commits by recoloring from the advanced logical state — seamless because pieces carry their colors. `Solve.tsx` rewires from the static `shown` model to a committed `baseCube` + `pendingMove` + `onAnimDone` step model. The 2.5D `Cube` and Paint route are untouched.

**Tech Stack:** React 19, TypeScript, Vite, vitest + @testing-library/react, three.js, @react-three/fiber v9 (React 19 compatible), @react-three/drei, react-router-dom v7.

**Spec:** `docs/superpowers/specs/2026-08-30-3d-solve-demo-design.md`

## Global Constraints

- Pure logic (`cube3d.ts`) MUST NOT import `three` or any R3F package — it stays jsdom-testable. Axis/angle are plain numbers.
- Paint route and the 2.5D `src/components/Cube.tsx` MUST NOT change. 3D is Solve-only.
- `solvability.ts`, `solver.ts`, `moves.ts`, AppContext persistence MUST NOT change.
- New Chinese UI strings go in one central spot (top of `Solve.tsx`) — they will be picked up by the later i18n (sub-project D) task; do not scatter them.
- Color scheme and cubie geometry convention: x=+1 R / -1 L, y=+1 U / -1 D, z=+1 F / -1 B (right-handed). Facelet→cubie position mapping is FIXED (see Task 1 table) and is the single source of truth the component also uses.

---

## File Structure

**Create:**
- `src/lib/cube3d.ts` — pure mapping logic: facelet↔cubie, layer membership, layer rotation (axis + signed 90° turns), arrow spec. No `three`.
- `src/lib/cube3d.test.ts` — TDD for the above.
- `src/components/Cube3D.tsx` — R3F component: 27 cubies + layer-group animation + arrow overlay.
- `src/components/Cube3D.test.tsx` — light tests: arrow-spec→DOM, no-throw, props passthrough (Canvas mocked).

**Modify:**
- `src/routes/Solve.tsx` — swap `Cube`→`Cube3D`; step model `baseCube`+`pendingMove`+`onAnimDone`; `stepMs` state (default 2000, 1000–5000, step 500).
- `src/components/SolveControls.tsx` — add speed slider; new props `stepMs`, `onStepMs`.
- `src/styles.css` — 3D canvas container sizing + slider styles.
- `package.json` — add `three`, `@react-three/fiber`, `@react-three/drei`, devDep `@types/three`.

**Untouched:** `src/components/Cube.tsx`, `src/routes/Paint.tsx`, `src/lib/{cube,moves,cubie,solver,solvability}.ts`, `src/state/AppContext.tsx`.

---

## Task 1: Pure facelet→cubie mapping (`cube3d.ts` part 1)

**Files:**
- Create: `src/lib/cube3d.ts`
- Test: `src/lib/cube3d.test.ts`

**Interfaces:**
- Consumes: `CubeState`, `Color`, `Face` from `../types`; `CENTERS` from `./cube`.
- Produces:
  - `interface CubieColor { pos: [number,number,number]; colors: (Color|null)[] }` — `colors` is length 6, indexed by face label order `['R','L','U','D','F','B']` (i.e. `+x,-x,+y,-y,+z,-z`); `null` for an inward-facing face of a surface cubie.
  - `export function cubiesFromState(cube: CubeState): CubieColor[]` — length 27, one per occupied position.

**Ground-truth facelet→position table** (derived from `CORNER_FACELETS`/`EDGE_FACELETS` in `cubie.ts`; the implementer copies this verbatim — it is the single source of truth):

```
facelet index → which cubie position(s) it colors, and which face of that cubie
Each face F has 9 facelets at grid (col,row), row0=top. The facelet's outward
normal is the face's axis direction. The cubie position is determined by the
facelet's grid location projected onto the face plane.

Face axis normals (outward):
  U +y, D -y, R +x, L -x, F +z, B -z

Facelet (col,row) on a face → cubie (x,y,z), with facelet row 0 = the row
farther from the viewer in that face's own oriented grid:
  U face (y=+1): col=x, row=z-1 ... row0(z=+1)→B side, row2(z=-1)→F side
     idx: 0=(-1,+1),1=(0,+1),2=(+1,+1),3=(-1,0),4=(0,0),5=(+1,0),6=(-1,-1),7=(0,-1),8=(+1,-1)
  D face (y=-1): col=x, row=-z-1 ... row0(z=-1)→F side
     idx: 0=(-1,-1),1=(0,-1),2=(+1,-1),3=(-1,0),4=(0,0),5=(+1,0),6=(-1,+1),7=(0,+1),8=(+1,+1)
  R face (x=+1): col=z, row=y-1 ... row0(y=+1)→U side
     idx: 0=(+1,-1,+1)? ... (use: col=col, row=row; x=+1; z=col-1; y=1-row)
     idx: 0=(+1,+1,-1),1=(+1,+1,0),2=(+1,+1,+1),3=(+1,0,-1),4=(+1,0,0),5=(+1,0,+1),6=(+1,-1,-1),7=(+1,-1,0),8=(+1,-1,+1)
  L face (x=-1): col=-z, row=y-1 ... x=-1; z=1-col; y=1-row
     idx: 0=(-1,+1,+1),1=(-1,+1,0),2=(-1,+1,-1),3=(-1,0,+1),4=(-1,0,0),5=(-1,0,-1),6=(-1,-1,+1),7=(-1,-1,0),8=(-1,-1,-1)
  F face (z=+1): col=x, row=y-1 ... z=+1; x=col-1; y=1-row
     idx: 0=(-1,+1,+1),1=(0,+1,+1),2=(+1,+1,+1),3=(-1,0,+1),4=(0,0,+1),5=(+1,0,+1),6=(-1,-1,+1),7=(0,-1,+1),8=(+1,-1,+1)
  B face (z=-1): col=-x, row=y-1 ... z=-1; x=1-col; y=1-row
     idx: 0=(+1,+1,-1),1=(0,+1,-1),2=(-1,+1,-1),3=(+1,0,-1),4=(0,0,-1),5=(-1,0,-1),6=(+1,-1,-1),7=(0,-1,-1),8=(-1,-1,-1)
```

The implementer builds one table `FACELET_POS: Record<Face, [number,number,number][]>` (length-9 arrays per face) from the above, then:

```ts
const FACE_AXES: Record<Face, [number,number,number]> = {
  U:[0,1,0], D:[0,-1,0], R:[1,0,0], L:[-1,0,0], F:[0,0,1], B:[0,0,-1],
}
const FACE_LABELS = ['R','L','U','D','F','B'] as const  // colors[] index order: +x,-x,+y,-y,+z,-z
const AXIS_OF_LABEL: Record<typeof FACE_LABELS[number], 'x'|'y'|'z'> =
  { R:'x', L:'x', U:'y', D:'y', F:'z', B:'z' }
```

Algorithm: for each face F and each idx 0..8, get pos `FACELET_POS[F][idx]`; the cubie at that pos gets `colors[FACE_LABELS.indexOf(F)] = cube[F][idx]`. All 6 faces filled → every surface sticker assigned. Interior cubies (none reachable) keep all-null; but a real `CubeState` only ever has surface stickers — positions like (0,0,0) are never written, so their colors stay `[null×6]` (center cubie, never visible; leave it).

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import type { CubeState } from '../types'
import { cubiesFromState } from './cube3d'
import { solvedCube } from './cube'

const find = (cs: ReturnType<typeof cubiesFromState>, x:number,y:number,z:number) =>
  cs.find(c => c.pos[0]===x && c.pos[1]===y && c.pos[2]===z)!

describe('cube3d mapping', () => {
  it('solved cube: URF corner cubie has white on +y, red on +x, green on +z', () => {
    const cs = cubiesFromState(solvedCube())
    const urf = find(cs, 1, 1, 1)   // +x +y +z = R U F corner
    const labels = ['R','L','U','D','F','B'] as const
    expect(urf.colors[labels.indexOf('U')]).toBe('W')  // +y
    expect(urf.colors[labels.indexOf('R')]).toBe('R')  // +x
    expect(urf.colors[labels.indexOf('F')]).toBe('G')  // +z
  })

  it('solved cube: DLF corner has yellow on -y, orange on -x, green on +z', () => {
    const cs = cubiesFromState(solvedCube())
    const dlf = find(cs, -1, -1, 1)
    const labels = ['R','L','U','D','F','B'] as const
    expect(dlf.colors[labels.indexOf('D')]).toBe('Y')
    expect(dlf.colors[labels.indexOf('L')]).toBe('O')
    expect(dlf.colors[labels.indexOf('F')]).toBe('G')
  })

  it('solved cube: a center-face cubie has exactly one non-null color', () => {
    const cs = cubiesFromState(solvedCube())
    const topCenter = find(cs, 0, 1, 0)  // U face center cubie
    const labels = ['R','L','U','D','F','B'] as const
    expect(topCenter.colors[labels.indexOf('U')]).toBe('W')
    expect(topCenter.colors.filter(Boolean)).toHaveLength(1)
  })

  it('solved cube: the hidden interior cubie (0,0,0) has all-null colors', () => {
    const cs = cubiesFromState(solvedCube())
    const center = find(cs, 0, 0, 0)
    expect(center.colors.every(c => c === null)).toBe(true)
  })

  it('returns exactly 27 cubies covering all positions', () => {
    const cs = cubiesFromState(solvedCube())
    expect(cs).toHaveLength(27)
    const key = (p:[number,number,number]) => p.join(',')
    expect(new Set(cs.map(c => key(c.pos))).size).toBe(27)
  })

  it('after a U move, the URF-position cubie is green/red/white (UF corner moved up)', () => {
    // U move cycles the top layer cw. Verify mapping reflects the engine's result.
    const { applyMoves, parseMoves } = await import('./moves')
    const after = applyMoves(solvedCube(), parseMoves('U'))
    const cs = cubiesFromState(after)
    const urf = find(cs, 1, 1, 1)
    const labels = ['R','L','U','D','F','B'] as const
    // After U, the cubie now at URF came from UFL; its +y stays white, but its
    // +x/+z stickers are the colors that were on UFL's -x/+z (orange/green).
    // The exact assignment is checked against the engine below; here just assert
    // the +y sticker is still white (top face turns in its own plane).
    expect(urf.colors[labels.indexOf('U')]).toBe('W')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cube3d.test.ts`
Expected: FAIL — `cubiesFromState` is not exported / module not found.

- [ ] **Step 3: Implement `cube3d.ts` (mapping only)**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/cube3d.test.ts`
Expected: PASS — all 6 tests. (If a corner color is wrong, the `FACELET_POS` table for that face is flipped; cross-check against `CORNER_FACELETS` in `src/lib/cubie.ts`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube3d.ts src/lib/cube3d.test.ts
git commit -m "feat(3d): pure facelet→cubie mapping with TDD"
```

---

## Task 2: Layer membership + rotation geometry (`cube3d.ts` part 2)

**Files:**
- Modify: `src/lib/cube3d.ts` (append)
- Test: `src/lib/cube3d.test.ts` (append)

**Interfaces:**
- Consumes: `CubieColor`, `Face`, `Move` from `../types`.
- Produces:
  - `export function layerPositions(face: Face): [number, number, number][]` — the 9 cubie positions in the layer turned by `face` (the slice whose coordinate on `face`'s axis equals the face's outward sign: U→y=+1, D→y=-1, R→x=+1, L→x=-1, F→z=+1, B→z=-1).
  - `export function layerAxis(face: Face): 'x' | 'y' | 'z'` — the rotation axis for that face's turn.
  - `export function turnDirection(face: Face, dir: 1 | -1 | 2): { axis: 'x'|'y'|'z'; quarterTurns: number }` — `quarterTurns` is signed: +1 = the direction `applyMove` rotates that layer for `dir=1` (cw). `dir=-1` → -1, `dir=2` → +2 (or -2; pick +2 consistently, 180° is sign-agnostic but keep it +2).
  - The sign convention MUST match `applyMove` in `src/lib/moves.ts` exactly, verified by a round-trip test (Task 2 Step tests): rotating the layer's 9 cubies by `quarterTurns` (as integer 90° rotations on that axis) and re-projecting face colors reproduces `applyMoves(solvedCube(), parseMoves(<face>))`.

**Sign derivation (do this empirically in the test, lock it in code):** The implementer determines each face's `dir=1` sign by trying both and checking which reproduces the engine. The expected mapping (right-handed coords, looking along the +axis toward origin = cw):
- U (axis y, dir 1): -1 (U cw viewed from top is -90° about +y in right-handed)
- D (axis y, dir 1): +1
- R (axis x, dir 1): -1
- L (axis x, dir 1): +1
- F (axis z, dir 1): -1
- B (axis z, dir 1): +1

(These follow the pattern: a face on the +axis side turns -1, on the -axis side turns +1, because "cw looking at the face from outside" is the opposite handedness to "cw about the +axis".) The test MUST verify each against the engine; if any mismatches, flip that face's sign.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/cube3d.test.ts`:

```ts
import { layerPositions, layerAxis, turnDirection } from './cube3d'
import { applyMoves, parseMoves } from './moves'

describe('cube3d layer geometry', () => {
  it('layerPositions returns 9 positions on the face axis', () => {
    expect(layerPositions('U').every(p => p[1] === 1)).toBe(true)
    expect(layerPositions('U')).toHaveLength(9)
    expect(layerPositions('D').every(p => p[1] === -1)).toBe(true)
    expect(layerPositions('R').every(p => p[0] === 1)).toBe(true)
    expect(layerPositions('L').every(p => p[0] === -1)).toBe(true)
    expect(layerPositions('F').every(p => p[2] === 1)).toBe(true)
    expect(layerPositions('B').every(p => p[2] === -1)).toBe(true)
  })

  it('layerAxis is correct per face', () => {
    expect(layerAxis('U')).toBe('y'); expect(layerAxis('D')).toBe('y')
    expect(layerAxis('R')).toBe('x'); expect(layerAxis('L')).toBe('x')
    expect(layerAxis('F')).toBe('z'); expect(layerAxis('B')).toBe('z')
  })

  it('turnDirection: dir=-1 negates, dir=2 doubles magnitude', () => {
    const cw = turnDirection('U', 1).quarterTurns
    expect(turnDirection('U', -1).quarterTurns).toBe(-cw)
    expect(turnDirection('U', 2).quarterTurns).toBe(2)
  })

  // Round-trip: rotating cubies by turnDirection and re-projecting reproduces
  // the move engine's facelet result, for every face. This locks the sign
  // convention to the engine.
  it('rotating a layer reproduces applyMove for every face', () => {
    for (const face of ['U','D','L','R','F','B'] as const) {
      for (const dir of [1,-1,2] as const) {
        const engine = applyMoves(solvedCube(), parseMoves(face + (dir===-1?"'":dir===2?'2':'')))
        const got = rotateLayerToState(solvedCube(), face, dir)
        expect(stateEquals(got, engine)).toBe(true)
      }
    }
  })
})
```

Note: the last test uses two helpers that are test-local — `rotateLayerToState` and `stateEquals`. Provide them in the test file:

```ts
import { cubiesFromState, FACELET_POS, FACE_LABELS } from './cube3d'
import type { CubeState, Face, Move } from '../types'
import { solvedCube } from './cube'

// Rotate the layer of `face` by move dir, returning the resulting CubeState.
// Pure integer 90° rotation of the 9 layer cubies, then re-project colors back
// to facelets via FACELET_POS. This is the reference the component's animation
// "commits" to.
function rotateLayerToState(start: CubeState, face: Face, dir: 1|-1|2): CubeState {
  const { turnDirection, layerPositions, rotatePos, cubiesFromState } = await import('./cube3d') as any
  // ... use the exports
}
```

Since `await import` inside a function is awkward in vitest, instead the implementer makes `rotateLayerToState` a real export under test: add to `cube3d.ts`:
- `export function rotatePos(pos, axis, quarterTurns): [number,number,number]` — integer 90° rotation.
- `export function applyLayerTurn(cube: CubeState, face: Face, dir: 1|-1|2): CubeState` — the pure commit function (rotate the 9 layer cubies' positions + their color arrays' face assignments, then re-project). This is what the component calls on animation completion.

Then the test's round-trip becomes: `expect(stateEquals(applyLayerTurn(solvedCube(), face, dir), engine)).toBe(true)`.

`stateEquals`:
```ts
function stateEquals(a: CubeState, b: CubeState): boolean {
  for (const f of ['U','D','L','R','F','B'] as Face[])
    for (let i = 0; i < 9; i++) if (a[f][i] !== b[f][i]) return false
  return true
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cube3d.test.ts`
Expected: FAIL — `layerPositions`/`turnDirection`/`applyLayerTurn` not exported.

- [ ] **Step 3: Implement layer geometry + applyLayerTurn**

Append to `src/lib/cube3d.ts`:

```ts
import type { Move } from '../types'

const AXIS_INDEX: Record<'x'|'y'|'z', 0|1|2> = { x: 0, y: 1, z: 2 }

export function layerAxis(face: Face): 'x' | 'y' | 'z' {
  return face === 'U' || face === 'D' ? 'y' : face === 'R' || face === 'L' ? 'x' : 'z'
}

export function layerPositions(face: Face): [number, number, number][] {
  const axis = layerAxis(face)
  const sign = FACE_AXES[face][AXIS_INDEX[axis]]  // +1 or -1
  const out: [number, number, number][] = []
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const p: [number, number, number] = [x, y, z]
        if (p[AXIS_INDEX[axis]] === sign) out.push(p)
      }
  return out
}

// Sign of a dir=1 (cw) turn on each face, in quarter-turns about the +axis.
// Verified against applyMove by the round-trip test; flip if the test fails.
const CW_SIGN: Record<Face, 1 | -1> = { U: -1, D: 1, R: -1, L: 1, F: -1, B: 1 }

export function turnDirection(face: Face, dir: 1 | -1 | 2): { axis: 'x'|'y'|'z'; quarterTurns: number } {
  const axis = layerAxis(face)
  const s = CW_SIGN[face]
  const qt = dir === 2 ? 2 : dir === -1 ? -s : s
  return { axis, quarterTurns: qt }
}

// Integer 90° rotation of a position about an axis. quarterTurns ∈ ℤ.
export function rotatePos(pos: [number,number,number], axis: 'x'|'y'|'z', quarterTurns: number): [number,number,number] {
  let [x, y, z] = pos
  const n = ((quarterTurns % 4) + 4) % 4
  for (let i = 0; i < n; i++) {
    // right-handed rotation about +axis
    if (axis === 'x') [y, z] = [-z, y]   // y'=-z, z'=y
    else if (axis === 'y') [x, z] = [z, -x]  // x'=z, z'=-x
    else [x, y] = [-y, x]              // x'=-y, y'=x
  }
  return [x, y, z]
}

// Rotate a cubie's 6-face color array about an axis. The colors[] order is
// R(+x),L(-x),U(+y),D(-y),F(+z),B(-z). A spatial rotation permutes which
// physical face each stored slot now faces.
function rotateColors(colors: (Color|null)[], axis: 'x'|'y'|'z', quarterTurns: number): (Color|null)[] {
  const n = ((quarterTurns % 4) + 4) % 4
  let c = colors.slice()
  // map: slot index 0..5 = +x,-x,+y,-y,+z,-z
  // For each axis, define where each face-slot moves.
  for (let i = 0; i < n; i++) {
    const o = c.slice()
    if (axis === 'x') {      // about +x: +y→+z→-y→-z→+y
      c[0]=o[0]; c[1]=o[1]; c[2]=o[4]; c[4]=o[3]; c[3]=o[5]; c[5]=o[2]
    } else if (axis === 'y') {  // about +y: +z→+x→-z→-x→+z
      c[2]=o[2]; c[3]=o[3]; c[0]=o[4]; c[4]=o[1]; c[1]=o[5]; c[5]=o[0]
    } else {                  // about +z: +x→+y→-x→-y→+x
      c[4]=o[4]; c[5]=o[5]; c[0]=o[2]; c[2]=o[1]; c[1]=o[3]; c[3]=o[0]
    }
  }
  return c
}

// Pure commit: apply a single face turn to a CubeState, by rotating the 9 layer
// cubies and re-projecting. Must match applyMove exactly.
export function applyLayerTurn(cube: CubeState, face: Face, dir: 1 | -1 | 2): CubeState {
  const { axis, quarterTurns } = turnDirection(face, dir)
  const cubies = cubiesFromState(cube)
  const layerSet = new Set(layerPositions(face).map(p => p.join(',')))
  // Build new position→colors map
  const moved = new Map<string, (Color|null)[]>()
  for (const c of cubies) {
    const k = c.pos.join(',')
    if (layerSet.has(k)) {
      const np = rotatePos(c.pos, axis, quarterTurns)
      moved.set(np.join(','), rotateColors(c.colors, axis, quarterTurns))
    } else {
      moved.set(k, c.colors.slice())
    }
  }
  // Re-project to facelets
  const out = {} as CubeState
  for (const f of FACES) out[f] = new Array(9).fill(null)
  for (const f of FACES) {
    const li = labelIndex(f)
    for (let i = 0; i < 9; i++) {
      const pos = FACELET_POS[f][i]
      out[f][i] = moved.get(pos.join(','))![li]
    }
  }
  return out
}
```

- [ ] **Step 4: Run tests to verify they pass — INCLUDING the round-trip**

Run: `npx vitest run src/lib/cube3d.test.ts`
Expected: PASS — the round-trip test for all 6 faces × 3 dirs MUST pass. If any `(face,dir)` fails, the bug is in `CW_SIGN` (flip that face) or in `rotateColors` permutation order. Debug by comparing `applyLayerTurn(solvedCube(),'U',1)` face-by-face vs `applyMoves(solvedCube(),parseMoves('U'))`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube3d.ts src/lib/cube3d.test.ts
git commit -m "feat(3d): layer geometry + applyLayerTurn matching move engine"
```

---

## Task 3: Arrow spec (`cube3d.ts` part 3)

**Files:**
- Modify: `src/lib/cube3d.ts` (append)
- Test: `src/lib/cube3d.test.ts` (append)

**Interfaces:**
- Produces: `export function arrowSpec(face: Face, dir: 1 | -1 | 2): { face: Face; dir: 1|-1|2 }` — identity now, but a single source of truth the component imports so it can later derive geometry. Keeps arrow logic out of the component and testable.

Actually the spec needs geometry for the component: which face plane, rotation direction in that plane, and the `×2` flag. Define:

```ts
export interface ArrowSpec {
  face: Face
  axis: 'x' | 'y' | 'z'        // the face's outward axis (which plane it lies in)
  sign: 1 | -1                 // outward direction along that axis (+x/-x etc.)
  sweep: 1 | 2                 // 1 for cw/ccw (dir 1/-1), 2 for 180°
  visualDir: 'cw' | 'ccw'      // arrow visual rotation on that face
  double: boolean              // show ×2 marker (dir === 2)
}
export function arrowSpec(face: Face, dir: 1 | -1 | 2): ArrowSpec
```

`visualDir` derives from `turnDirection(face, dir)`: if `quarterTurns > 0` → 'cw', else 'ccw'. `sweep` = `Math.abs(quarterTurns) === 2 ? 2 : 1`. `double` = `dir === 2`.

- [ ] **Step 1: Write failing tests**

```ts
import { arrowSpec } from './cube3d'

describe('cube3d arrowSpec', () => {
  it('dir=1 yields sweep 1, not double', () => {
    const a = arrowSpec('U', 1)
    expect(a.sweep).toBe(1)
    expect(a.double).toBe(false)
    expect(['cw','ccw']).toContain(a.visualDir)
  })
  it('dir=2 yields sweep 2 and double marker', () => {
    const a = arrowSpec('F', 2)
    expect(a.sweep).toBe(2)
    expect(a.double).toBe(true)
  })
  it('dir=-1 reverses visualDir of dir=1 for the same face', () => {
    expect(arrowSpec('R', -1).visualDir).not.toBe(arrowSpec('R', 1).visualDir)
  })
  it('axis/sign match the face', () => {
    expect(arrowSpec('U', 1).axis).toBe('y'); expect(arrowSpec('U', 1).sign).toBe(1)
    expect(arrowSpec('D', 1).axis).toBe('y'); expect(arrowSpec('D', 1).sign).toBe(-1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/cube3d.test.ts`
Expected: FAIL — `arrowSpec` not exported.

- [ ] **Step 3: Implement arrowSpec**

Append to `src/lib/cube3d.ts`:

```ts
export interface ArrowSpec {
  face: Face
  axis: 'x' | 'y' | 'z'
  sign: 1 | -1
  sweep: 1 | 2
  visualDir: 'cw' | 'ccw'
  double: boolean
}

export function arrowSpec(face: Face, dir: 1 | -1 | 2): ArrowSpec {
  const axis = layerAxis(face)
  const sign = (FACE_AXES[face][AXIS_INDEX[axis]] > 0 ? 1 : -1) as 1 | -1
  const { quarterTurns } = turnDirection(face, dir)
  const sweep = (Math.abs(quarterTurns) === 2 ? 2 : 1) as 1 | 2
  return {
    face, axis, sign, sweep,
    visualDir: quarterTurns > 0 ? 'cw' : 'ccw',
    double: dir === 2,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/cube3d.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube3d.ts src/lib/cube3d.test.ts
git commit -m "feat(3d): arrowSpec for turning-face arrow overlay"
```

---

## Task 4: Install 3D deps + verify build/test still green

**Files:**
- Modify: `package.json`

**Interfaces:** none (dependency add only).

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

Expected: `package.json` gains `three`, `@react-three/fiber`, `@react-three/drei` in dependencies and `@types/three` in devDependencies. Pin to whatever npm resolves (R3F v9+ for React 19 compat).

- [ ] **Step 2: Verify tsc + tests still pass (no regressions from the new deps)**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — 12 files, all green. (New deps are not imported anywhere yet, so nothing breaks.)

- [ ] **Step 3: Verify dev server boots with three available**

Run (background, then kill): `timeout 15 npx vite --port 5174 build --logLevel error || true` — actually use the build:
```bash
npx vite build 2>&1 | tail -5
```
Expected: build succeeds (confirms three resolves under Vite). If build fails on three/R3F resolution, check that `@react-three/fiber` is v9+ (React 19).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(3d): add three, @react-three/fiber, @react-three/drei"
```

---

## Task 5: `Cube3D` component — render 27 cubies (no animation yet)

**Files:**
- Create: `src/components/Cube3D.tsx`
- Create: `src/components/Cube3D.test.tsx`

**Interfaces:**
- Consumes: `cubiesFromState`, `FACE_LABELS`, `CubieColor` from `../lib/cube3d`; `three`, `@react-three/fiber`.
- Produces:
  ```ts
  export function Cube3D(props: {
    cube: CubeState
    pendingMove: Move | null
    stepMs: number
    onAnimDone?: () => void
  }): JSX.Element
  ```
  In this task `pendingMove`/`stepMs`/`onAnimDone` are accepted but only `cube` is rendered. Animation lands in Task 6; arrow in Task 7. This task proves the Canvas + 27 cubies render without throwing.

**Color hex** (reuse from `Sticker.tsx`): `W:#f8f8f8 Y:#ffd500 R:#c41e3a O:#ff8c00 G:#009e60 B:#0051ba`. Black `#111` for inward/null faces.

- [ ] **Step 1: Write failing test (mock Canvas to avoid WebGL in jsdom)**

`src/components/Cube3D.test.tsx`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock @react-three/fiber Canvas so we never touch WebGL in jsdom.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="canvas">{children}</div>,
}))
// drei not imported by Cubie rendering in this task; if used, mock similarly.

import { Cube3D } from './Cube3D'
import { solvedCube } from '../lib/cube'

describe('Cube3D', () => {
  it('renders a Canvas and 27 cubies for a solved cube (no throw)', () => {
    const { container } = render(
      <Cube3D cube={solvedCube()} pendingMove={null} stepMs={2000} />,
    )
    expect(container.querySelector('[data-testid="canvas"]')).toBeTruthy()
    // 27 cubie meshes rendered as data-cubie nodes
    expect(container.querySelectorAll('[data-cubie]')).toHaveLength(27)
  })
})
```

Note: real three meshes won't render in jsdom even with Canvas mocked if we use three meshes directly. So `Cubie` is a thin component that renders a `<mesh data-cubie ...>` — but `<mesh>` is an R3F intrinsic that only exists inside `<Canvas>`. Since our `Canvas` mock just renders children into a div, the `<mesh>` elements become... not real DOM. So instead the test checks the *count* via a non-R3F marker. **Resolution:** `Cubie` renders a plain `<group data-cubie>` wrapper is also R3F-intrinsic. The cleanest jsdom-friendly approach: factor the cubie list into a pure `cubieMeshes(cube)` data array (tested directly) and have `Cube3D` map it to R3F elements inside Canvas. Test the data array, not the R3F tree.

Revised approach — add to `Cube3D.tsx`:
```ts
export function cubieMeshData(cube: CubeState) {
  return cubiesFromState(cube).map(c => ({
    pos: c.pos,
    faceColors: c.colors,  // length-6
  }))
}
```
And the test:
```ts
import { cubieMeshData } from './Cube3D'
it('cubieMeshData returns 27 entries with positions and 6 face colors', () => {
  const data = cubieMeshData(solvedCube())
  expect(data).toHaveLength(27)
  expect(data[0].faceColors).toHaveLength(6)
})
it('Cube3D does not throw and renders a Canvas shell', () => {
  const { container } = render(<Cube3D cube={solvedCube()} pendingMove={null} stepMs={2000} />)
  expect(container.querySelector('[data-testid="canvas"]')).toBeTruthy()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Cube3D.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Cube3D (render only)**

`src/components/Cube3D.tsx`:
```tsx
import { Canvas } from '@react-three/fiber'
import { THREE } from 'three'  // if needed for geometry; use R3F intrinsics where possible
import { cubiesFromState, FACE_LABELS } from '../lib/cube3d'
import type { CubeState, Color, Move } from '../types'

const HEX: Record<Color, string> = { W:'#f8f8f8', Y:'#ffd500', R:'#c41e3a', O:'#ff8c00', G:'#009e60', B:'#0051ba' }
const GAP = 1.08  // cubie spacing

export function cubieMeshData(cube: CubeState) {
  return cubiesFromState(cube).map(c => ({ pos: c.pos, faceColors: c.colors }))
}

function Cubie({ pos, faceColors }: { pos:[number,number,number]; faceColors:(Color|null)[] }) {
  const [x,y,z] = pos
  // A cubie is a rounded box; 6 face stickers as plane meshes offset to each face.
  const faces: { color: string; pos:[number,number,number]; rot:[number,number,number] }[] = [
    { color: faceColors[0] ? HEX[faceColors[0]] : '#111', pos:[0.5,0,0], rot:[0,Math.PI/2,0] }, // +x R
    { color: faceColors[1] ? HEX[faceColors[1]] : '#111', pos:[-0.5,0,0], rot:[0,Math.PI/2,0] }, // -x L
    { color: faceColors[2] ? HEX[faceColors[2]] : '#111', pos:[0,0.5,0], rot:[-Math.PI/2,0,0] }, // +y U
    { color: faceColors[3] ? HEX[faceColors[3]] : '#111', pos:[0,-0.5,0], rot:[Math.PI/2,0,0] }, // -y D
    { color: faceColors[4] ? HEX[faceColors[4]] : '#111', pos:[0,0,0.5], rot:[0,0,0] },          // +z F
    { color: faceColors[5] ? HEX[faceColors[5]] : '#111', pos:[0,0,-0.5], rot:[0,0,0] },         // -z B
  ]
  return (
    <group position={[x*GAP, y*GAP, z*GAP]} data-cubie>
      {/* black core */}
      <mesh>
        <boxGeometry args={[1,1,1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {faces.map((f,i) => (
        <mesh key={i} position={f.pos} rotation={f.rot}>
          <planeGeometry args={[0.92,0.92]} />
          <meshStandardMaterial color={f.color} />
        </mesh>
      ))}
    </group>
  )
}

export function Cube3D({ cube, pendingMove, stepMs, onAnimDone }: {
  cube: CubeState; pendingMove: Move | null; stepMs: number; onAnimDone?: () => void
}) {
  const data = cubieMeshData(cube)
  return (
    <div className="cube3d-wrap" data-testid="canvas">
      <Canvas camera={{ position:[3.5,3.5,3.5], fov:45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5,8,5]} intensity={0.8} />
        <group rotation={[0,0,0]}>
          {data.map((c,i) => <Cubie key={i} pos={c.pos} faceColors={c.faceColors} />)}
        </group>
      </Canvas>
    </div>
  )
}
```

Note on `data-cubie` on an R3F `<group>`: R3F intrinsics don't forward arbitrary DOM attrs to real DOM, so `data-cubie` won't appear in jsdom via the Canvas mock. **The test relies on `cubieMeshData` length, not on DOM cubie count.** Remove the `data-cubie` assertion from the test (already revised above). Keep `data-testid="canvas"` on the wrapper div (real DOM).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Cube3D.test.tsx`
Expected: PASS — `cubieMeshData` length 27, Canvas shell renders.

- [ ] **Step 5: Manually verify in browser**

Run: `npx vite dev` then temporarily mount `<Cube3D>` somewhere viewable (or wait for Task 8 wiring). At this stage, just confirm `npx vite build` still passes:
```bash
npx vite build 2>&1 | tail -5
```
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add src/components/Cube3D.tsx src/components/Cube3D.test.tsx
git commit -m "feat(3d): Cube3D renders 27 cubies via R3F (no animation)"
```

---

## Task 6: Layer rotation animation in `Cube3D`

**Files:**
- Modify: `src/components/Cube3D.tsx`
- Modify: `src/components/Cube3D.test.tsx` (extend mocks)

**Interfaces:**
- Consumes: `applyLayerTurn`, `layerPositions`, `turnDirection`, `rotatePos` from `../lib/cube3d`; `useFrame` from `@react-three/fiber`; `useState`/`useRef`/`useEffect` from React.
- Produces: `Cube3D` now animates `pendingMove`: when a non-null `pendingMove` arrives, the 9 layer cubies rotate from 0 to the target angle over `stepMs`, then `onAnimDone` fires (Solve advances the logical index, which feeds a new committed `cube` prop).

**Animation model (spec §"3D 场景结构"):** Rather than physically reparenting meshes into a transient group (fiddly in R3F), use the **overlay-group** approach: render a single `<group ref={layerRef}>` that holds 9 cubie *copies* positioned at the layer positions; when `pendingMove` is active, rotate this group via `useFrame` from 0 → target quarter-turn. The 27 base cubies render the committed `cube`; during animation the layer group is shown ON TOP (it carries the moving layer's current colors), and the base cubies in that layer are hidden. At animation end, `onAnimDone` fires; parent swaps `cube` to the post-turn state; layer group resets to 0 and is hidden; base shows the new state. Because `applyLayerTurn` already produced the exact end state, the swap is visually seamless (same colors, now grid-aligned).

Target angle: `turnDirection(face, dir).quarterTurns * (Math.PI/2)` about `turnDirection(...).axis`, applied as a `rotation` on the group. Sign comes from `quarterTurns`.

- [ ] **Step 1: Write failing test for animation lifecycle (mocked useFrame)**

Extend the `@react-three/fiber` mock to include `useFrame`:
```ts
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),   // no-op; animation tested via logic, not rAF
}))
```

Add a test that asserts the component calls `onAnimDone` after the step duration. Since `useFrame` is mocked no-op, the real timing lives in a pure helper — extract `animationProgress(elapsedMs, stepMs)` returning a clamped 0..1 eased value, and test it:

```ts
import { animationProgress } from './Cube3D'
it('animationProgress clamps to [0,1] and eases', () => {
  expect(animationProgress(0, 2000)).toBe(0)
  expect(animationProgress(1000, 2000)).toBeCloseTo(0.5)
  expect(animationProgress(3000, 2000)).toBe(1)
})
```

And test that `onAnimDone` is invoked when progress reaches 1 — model this in a pure `isDone(elapsedMs, stepMs)`:
```ts
import { isDone } from './Cube3D'
it('isDone true at/after stepMs', () => {
  expect(isDone(1999, 2000)).toBe(false)
  expect(isDone(2000, 2000)).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Cube3D.test.tsx`
Expected: FAIL — `animationProgress`/`isDone` not exported.

- [ ] **Step 3: Implement animation**

Add to `Cube3D.tsx`:
```ts
export const animationProgress = (elapsedMs: number, stepMs: number) => {
  const t = Math.min(1, Math.max(0, elapsedMs / stepMs))
  // easeInOutCubic for smooth start/stop
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2
}
export const isDone = (elapsedMs: number, stepMs: number) => elapsedMs >= stepMs
```

Rework `Cube3D` to use refs + `useFrame`. Pseudocode for the component body:
```tsx
import { useFrame } from '@react-three/fiber'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { applyLayerTurn, layerPositions, turnDirection } from '../lib/cube3d'

export function Cube3D({ cube, pendingMove, stepMs, onAnimDone }) {
  const layerRef = useRef<THREE.Group>(null)
  const startRef = useRef<number | null>(null)
  const [committed, setCommitted] = useState(cube)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (pendingMove && !animating) {
      setAnimating(true)
      startRef.current = null
    }
  }, [pendingMove])

  useFrame((state) => {
    if (!animating || !pendingMove || !layerRef.current) return
    if (startRef.current === null) startRef.current = state.clock.elapsedTime * 1000
    const elapsed = state.clock.elapsedTime * 1000 - startRef.current
    const p = animationProgress(elapsed, stepMs)
    const { axis, quarterTurns } = turnDirection(pendingMove.face, pendingMove.dir)
    const angle = quarterTurns * (Math.PI / 2) * p
    const r = layerRef.current.rotation
    if (axis === 'x') r.set(angle, 0, 0)
    else if (axis === 'y') r.set(0, angle, 0)
    else r.set(0, 0, angle)
    if (isDone(elapsed, stepMs)) {
      // snap to exact end, commit, notify
      const final = applyLayerTurn(committed, pendingMove.face, pendingMove.dir)
      r.set(0,0,0)
      setCommitted(final)
      setAnimating(false)
      onAnimDone?.()
    }
  })

  // layer cubies: during animation, show the PRE-turn layer cubies rotated
  const layerPositionsArr = pendingMove && animating ? layerPositions(pendingMove.face) : []
  const layerSet = new Set(layerPositionsArr.map(p => p.join(',')))
  const data = cubieMeshData(committed)
  return (
    <div className="cube3d-wrap" data-testid="canvas">
      <Canvas camera={{ position:[3.5,3.5,3.5], fov:45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5,8,5]} intensity={0.8} />
        {data.map((c,i) => (
          <Cubie key={i} pos={c.pos} faceColors={c.faceColors}
            hidden={animating && layerSet.has(c.pos.join(','))} />
        ))}
        {/* animated layer overlay */}
        <group ref={layerRef}>
          {animating && pendingMove && layerPositionsArr.map((p,i) => {
            const c = data.find(d => d.pos.join(',') === p.join(','))!
            return <Cubie key={'L'+i} pos={p} faceColors={c.faceColors} />
          })}
        </group>
      </Canvas>
    </div>
  )
}
```

`Cubie` gains a `hidden?: boolean` prop → when true, render `<group visible={false}>` (or skip). The base layer hides so only the rotating overlay shows; at `isDone`, overlay resets and base (now `committed` = post-turn) shows.

**Caveat the implementer must handle:** `committed` must re-sync when `cube` prop changes externally (e.g. parent step-back). Add a `useEffect(() => setCommitted(cube), [cube])` that runs when not animating. The exact re-sync is validated in Task 8 integration; here just ensure build + unit tests pass.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Cube3D.test.tsx`
Expected: PASS — `animationProgress`/`isDone` unit tests pass; component still renders shell without throw.

- [ ] **Step 5: Commit**

```bash
git add src/components/Cube3D.tsx src/components/Cube3D.test.tsx
git commit -m "feat(3d): layer rotation animation via useFrame + commit-on-done"
```

---

## Task 7: Arrow overlay on the turning face

**Files:**
- Modify: `src/components/Cube3D.tsx`
- Modify: `src/components/Cube3D.test.tsx`

**Interfaces:**
- Consumes: `arrowSpec` from `../lib/cube3d`; `Line`, `Text` from `@react-three/drei` (mock in test).
- Produces: when `pendingMove` is active (animating), an arrow renders on the turning face, fixed in that face's plane, rotating with the cube (no Billboard). `dir=2` shows a wide single arc + `×2` text.

**Arrow geometry:** an `<Arrow>` sub-component draws a curved arc (theta sweep 1 → ~270° for `double` to read as "big arc", ~120° otherwise) as a `Line`, with an arrowhead (small cone mesh) at the arc end, positioned on the face plane offset outward by `~0.55` along the face normal. `visualDir` flips the arc's sweep direction.

- [ ] **Step 1: Write failing test**

Mock drei:
```ts
vi.mock('@react-three/drei', () => ({
  Line: (props: any) => <div data-testid="line" data-points={JSON.stringify(props.points)} />,
  Text: (props: any) => <div data-testid="text" data-str={props.children} />,
}))
```

Add a pure helper `arrowGeometry(spec: ArrowSpec)` returning `{ points: number[][]; headPos: number[]; headRot: number[]; showX2: boolean }` and test:
```ts
import { arrowGeometry } from './Cube3D'
import { arrowSpec } from '../lib/cube3d'
it('dir=2 arrow has showX2 true and a long sweep', () => {
  const g = arrowGeometry(arrowSpec('F', 2))
  expect(g.showX2).toBe(true)
  expect(g.points.length).toBeGreaterThan(10)   // a sampled arc
})
it('dir=1 arrow has showX2 false', () => {
  expect(arrowGeometry(arrowSpec('F', 1)).showX2).toBe(false)
})
it('ccw vs cw reverse the point order (visualDir)', () => {
  const cw = arrowGeometry(arrowSpec('U', 1)).points
  const ccw = arrowGeometry(arrowSpec('U', -1)).points
  expect(ccw).not.toEqual(cw)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Cube3D.test.tsx`
Expected: FAIL — `arrowGeometry` not exported.

- [ ] **Step 3: Implement Arrow + arrowGeometry**

Add to `Cube3D.tsx`:
```ts
import { arrowSpec as makeArrow, type ArrowSpec } from '../lib/cube3d'

// Build an arc on the face plane. We work in the face's local 2D coords then
// map to 3D. Returns sampled points + arrowhead placement.
export function arrowGeometry(spec: ArrowSpec) {
  const sweep = spec.double ? Math.PI * 1.4 : Math.PI * 0.7   // big arc for 180
  const steps = 24
  const r = 0.55
  const dir = spec.visualDir === 'cw' ? 1 : -1
  const pts2d: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * sweep * dir
    pts2d.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  // map 2D (u,v) on the face plane to 3D, offset outward by sign*0.55
  const off = spec.sign * 0.55
  const points: number[][] = pts2d.map(([u, v]) => {
    if (spec.axis === 'x') return [off, u, v]
    if (spec.axis === 'y') return [u, off, v]
    return [u, v, off]
  })
  const head2 = pts2d[pts2d.length - 1]
  const headPos: number[] =
    spec.axis === 'x' ? [off, head2[0], head2[1]]
    : spec.axis === 'y' ? [head2[0], off, head2[1]]
    : [head2[0], head2[1], off]
  const headRot: number[] = [0, 0, 0]   // orient cone along tangent; fine-tune visually
  return { points, headPos, headRot, showX2: spec.double }
}
```

`<Arrow>` component (inside Canvas):
```tsx
function Arrow({ spec }: { spec: ArrowSpec }) {
  const g = arrowGeometry(spec)
  return (
    <group>
      <Line points={g.points} color="#ffffff" lineWidth={4} />
      <mesh position={g.headPos} rotation={g.headRot as any}>
        <coneGeometry args={[0.08, 0.2, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {g.showX2 && <Text position={[0, 0, 0]} fontSize={0.3} color="#ffffff">×2</Text>}
    </group>
  )
}
```

In `Cube3D`, render `<Arrow>` inside the canvas when `animating && pendingMove`:
```tsx
{animating && pendingMove && <Arrow spec={makeArrow(pendingMove.face, pendingMove.dir)} />}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Cube3D.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Cube3D.tsx src/components/Cube3D.test.tsx
git commit -m "feat(3d): turning-face arrow overlay (×2 for 180°)"
```

---

## Task 8: Rewire `Solve.tsx` to `Cube3D` with step/animation model

**Files:**
- Modify: `src/routes/Solve.tsx`
- Modify: `src/routes/Solve.test.tsx` (update expectation; back link stays)

**Interfaces:**
- Consumes: `Cube3D` from `../components/Cube3D`; `solve` from `../lib/solver`; `applyMoves` removed (no longer computing static `shown` — `Cube3D` commits internally; but we still need the *current committed* state for controls/progress). Actually we keep a `baseCube` = `applyMoves(cube, flatMoves.slice(0, i))` for the *base* state fed to `Cube3D`, and `pendingMove = flatMoves[i] ?? null` for the move being animated. On `onAnimDone` → `setI(i+1)`.
- Produces: Solve route drives 3D animation step-by-step.

**Step model:**
- `i` = number of fully-committed moves (0..flatMoves.length).
- `baseCube = applyMoves(cube, flatMoves.slice(0, i))` — what's shown when idle.
- `pendingMove = flatMoves[i] ?? null` — the move `Cube3D` animates next; null when done.
- `onAnimDone`: `setI(n => Math.min(flatMoves.length, n + 1))`. Once `i` advances, `pendingMove` becomes the next move (or null at end), `baseCube` updates → `Cube3D` re-syncs its `committed` to the new base and is ready.
- Manual prev: `setI(n => Math.max(0, n - 1))` — this changes `baseCube` to the earlier state and `pendingMove` to the move that was just undone. But undoing should animate the *inverse* move. Simplest correct behavior: manual prev sets `i` back and `Cube3D` snaps (no animation) to the earlier base. Implement `snapMode`: a `key` on `Cube3D` that forces re-mount on manual step (snap, no anim). Playing/next uses animation.

Concretely: track `animate: boolean` state. `onPlay`/`onNext` (auto or manual next) set `animate=true` and let `pendingMove` animate. `onPrev` sets `animate=false`, decrements `i`, and bumps a `snapKey` to force `Cube3D` remount at the earlier base.

- [ ] **Step 1: Write/update failing test**

`Solve.test.tsx` currently asserts back link + a control button. Keep those. Add: the route renders the `Cube3D` shell (query `[data-testid="canvas"]`):
```ts
it('renders the 3D canvas for a solvable cube', () => {
  renderSolve()
  expect(screen.getByText('返回填色')).toBeInTheDocument()
  expect(document.querySelector('[data-testid="canvas"]')).toBeTruthy()
})
```
(Note: `Cube3D`'s Canvas mock from `Cube3D.test.tsx` is file-scoped; Solve.test needs its own mock or the real `Cube3D` — but real `Cube3D` pulls `@react-three/fiber` which needs WebGL. So `Solve.test.tsx` must ALSO mock `@react-three/fiber` and `@react-three/drei` at file top, OR mock `../components/Cube3D` entirely. Cleanest: mock the `Cube3D` module.)
```ts
vi.mock('../components/Cube3D', () => ({
  Cube3D: (props: any) => <div data-testid="canvas" data-pending={JSON.stringify(props.pendingMove)} />,
}))
```
Then assert the canvas shell renders and `data-pending` reflects the first move. For a solved cube, `solve()` returns 0 moves, so `pendingMove` is null and `data-pending` is `"null"`. Use a lightly-scrambled cube instead so there's at least one move:
```ts
import { applyMoves, parseMoves } from '../lib/moves'
// in renderSolve, seed a 1-move scramble:
localStorage.setItem('rc.paint', JSON.stringify(applyMoves(solvedCube(), parseMoves('R'))))
```
Then `pendingMove` is the R' inverse… actually `solve()` will return moves to solve it. Assert `data-pending` is not `"null"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/routes/Solve.test.tsx`
Expected: FAIL — Solve still renders old `Cube` (no `[data-testid="canvas"]`).

- [ ] **Step 3: Implement Solve rewire**

`src/routes/Solve.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { solve } from '../lib/solver'
import { applyMoves } from '../lib/moves'
import { Cube3D } from '../components/Cube3D'
import { SolveControls } from '../components/SolveControls'
import type { Move } from '../types'

// UI strings (centralized for later i18n — sub-project D).
const TXT = {
  back: '返回填色',
  done: '已复原 ✓',
  nextLabel: '下一步转动',
  prevLabel: '上一步',
  doneBtn: '完成',
  nextBtn: '下一步',
}

function formatMove(m: Move): string {
  return m.face + (m.dir === -1 ? "'" : m.dir === 2 ? '2' : '')
}

export default function Solve() {
  const { cube, full, validation } = useApp()
  const solvable = full && validation?.solvable
  const steps = useMemo(() => (solvable ? solve(cube) : []), [cube, solvable])
  const flatMoves = useMemo(() => steps.flatMap(s => s.moves), [steps])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [snapKey, setSnapKey] = useState(0)
  const [stepMs, setStepMs] = useState(2000)
  const [animate, setAnimate] = useState(true)

  const baseCube = useMemo(() => applyMoves(cube, flatMoves.slice(0, i)), [cube, flatMoves, i])
  const pendingMove = animate && i < flatMoves.length ? flatMoves[i] : null
  const done = i >= flatMoves.length

  // auto-advance: when not playing, Cube3D's onAnimDone advances i once.
  // when playing, onAnimDone advances i and Cube3D will animate the next.
  const onAnimDone = () => setI(n => Math.min(flatMoves.length, n + 1))

  // playback timer fallback (in case onAnimDone stalls): not needed if onAnimDone
  // always fires; keep a guard so play doesn't hang. Omit for now; rely on onAnimDone.

  useEffect(() => {
    if (!playing) return
    if (done) { setPlaying(false) }
  }, [playing, done])

  if (!solvable) return <Navigate to="/" replace />

  // current step caption
  let acc = 0, current = steps[0]
  for (const s of steps) { if (i <= acc + s.moves.length) { current = s; break } acc += s.moves.length }

  return (
    <div className="app solve">
      <header className="solve-header">
        <Link to="/" className="back">{TXT.back}</Link>
        <span className="progress">{i}/{flatMoves.length}</span>
      </header>
      <Cube3D
        key={snapKey}
        cube={baseCube}
        pendingMove={pendingMove}
        stepMs={stepMs}
        onAnimDone={onAnimDone}
      />
      <div className="current-move" aria-live="polite">
        {done
          ? <span className="move-done">{TXT.done}</span>
          : <><span className="move-label">{TXT.nextLabel}</span><span className="move-notation">{formatMove(flatMoves[i])}</span></>}
      </div>
      <p className="solve-caption"><b>{current?.stage}</b> — {current?.note}</p>
      <SolveControls
        index={i} total={flatMoves.length} playing={playing}
        stepMs={stepMs} onStepMs={setStepMs}
        onPrev={() => { setAnimate(false); setSnapKey(k => k + 1); setI(n => Math.max(0, n - 1)) }}
        onNext={() => { setAnimate(true); setI(n => Math.min(flatMoves.length, n + 1)) }}
        onPlay={() => setPlaying(p => !p)}
      />
    </div>
  )
}
```

Note: `onNext` here increments `i` directly AND sets animate true — but then `pendingMove` would be `flatMoves[i+1]`, animating the *next* move from the already-advanced base. That double-advances. **Fix:** manual next should animate the *current* pending move, not skip ahead. So `onNext` should just trigger animation of `flatMoves[i]`: set `animate=true` (it already is the pending move) and let `onAnimDone` advance. If `animate` was false (after a prev snap), `onNext` sets `animate=true` and bumps `snapKey`? No — that would remount and lose state. Simpler: when idle and user hits next, `pendingMove` is already `flatMoves[i]`; `onAnimDone` advances. So `onNext` does nothing but ensure `animate=true` and let `Cube3D` run. But `Cube3D` only animates when `pendingMove` transitions from null→move. If `pendingMove` was already non-null and `animate` already true, it's animating. After `onAnimDone`, `i++` makes `pendingMove` the next move → animates. So:

- `onNext` (when not playing): if `animate` is false, set `animate=true` (and the effect of `pendingMove` becoming non-null triggers animation). If already true but idle (animation finished), we need a retrigger — bump `snapKey` is wrong. Instead, expose an `animationNonce` that `Cube3D` watches. **Simplest robust design:** `Cube3D` animates whenever its `pendingMove` prop is non-null; on finish it sets internal `animating=false` and calls `onAnimDone`. To retrigger the same move, parent changes `pendingMove` identity or a `nonce`. Give `Cube3D` a `moveNonce` prop that increments each time the parent wants (re)animation; `Cube3D` animates on nonce change. Pass `moveNonce = i` (changes each step) plus `pendingMove`.

Final props: `cube`, `pendingMove`, `stepMs`, `onAnimDone`, `moveNonce={i}`. `Cube3D`'s `useEffect` watches `moveNonce`: when it changes and `pendingMove` is non-null, start animation. This handles play auto-advance and manual next uniformly. Manual prev: parent sets `animate=false`, decrements `i`, bumps `snapKey` to remount `Cube3D` at the earlier base with `pendingMove=null` (snap, no anim).

The implementer finalizes `Cube3D` to accept `moveNonce` and wire its `useEffect` to it (update Task 6's `useEffect` accordingly: depend on `moveNonce` not `pendingMove`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/routes/Solve.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Solve.tsx src/routes/Solve.test.tsx
git commit -m "feat(solve): drive Cube3D step/animation model, centralized strings"
```

---

## Task 9: Speed slider in `SolveControls` + styles

**Files:**
- Modify: `src/components/SolveControls.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `SolveControls` props: `index, total, playing, stepMs, onStepMs, onPrev, onNext, onPlay`.
- Slider: `<input type="range" min="1" max="5" step="0.5" value={stepMs/1000} onChange={e => onStepMs(Number(e.target.value)*1000)}>` with label `速度: {x}秒/步`.

- [ ] **Step 1: Write failing test**

`SolveControls` has no test file currently. Add `src/components/SolveControls.test.tsx`:
```ts
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SolveControls } from './SolveControls'

describe('SolveControls', () => {
  it('renders a speed slider labeled with seconds per step', () => {
    render(<SolveControls index={0} total={5} playing={false} stepMs={2000}
      onStepMs={()=>{}} onPrev={()=>{}} onNext={()=>{}} onPlay={()=>{}} />)
    expect(screen.getByText(/秒\/步/)).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('min', '1')
    expect(screen.getByRole('slider')).toHaveAttribute('max', '5')
    expect(screen.getByRole('slider')).toHaveAttribute('step', '0.5')
  })
  it('moving the slider calls onStepMs with ms', () => {
    const onStepMs = vi.fn()
    render(<SolveControls index={0} total={5} playing={false} stepMs={2000}
      onStepMs={onStepMs} onPrev={()=>{}} onNext={()=>{}} onPlay={()=>{}} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } })
    expect(onStepMs).toHaveBeenCalledWith(3000)
  })
})
```
Add `vi` to imports.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SolveControls.test.tsx`
Expected: FAIL — no slider rendered / props mismatch.

- [ ] **Step 3: Implement slider + styles**

`src/components/SolveControls.tsx`:
```tsx
export function SolveControls({ index, total, onPrev, onNext, onPlay, playing, stepMs, onStepMs }: {
  index: number; total: number; onPrev: () => void; onNext: () => void; onPlay: () => void
  playing: boolean; stepMs: number; onStepMs: (ms: number) => void
}) {
  const atEnd = index >= total
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0}>上一步</button>
      <button onClick={onPlay}>{playing ? '暂停' : '播放'}</button>
      <button onClick={onNext} disabled={atEnd}>{atEnd ? '完成' : '下一步'}</button>
      <label className="speed">
        速度: {(stepMs/1000).toFixed(1)}秒/步
        <input type="range" min={1} max={5} step={0.5} value={stepMs/1000}
          onChange={e => onStepMs(Number(e.target.value) * 1000)} />
      </label>
    </div>
  )
}
```

`src/styles.css` — append:
```css
.cube3d-wrap {
  width: 320px;
  height: 360px;
  max-width: 90vw;
  margin: 8px auto;
}
.cube3d-wrap canvas { width: 100% !important; height: 100% !important; border-radius: 16px; }
.solve-controls .speed {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-size: 13px; color: #fff; margin-left: 8px;
}
.solve-controls .speed input[type=range] { width: 140px; accent-color: #2f7fd6; }
```
Also adjust `.solve-controls` to wrap (it now has 4 children): add `flex-wrap: wrap; justify-content: center;` if needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SolveControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SolveControls.tsx src/components/SolveControls.test.tsx src/styles.css
git commit -m "feat(solve): 1–5s/step speed slider with 0.5 step"
```

---

## Task 10: Full verification + manual QA + cleanup

**Files:** none new (verification task).

- [ ] **Step 1: Full typecheck + test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; all test files pass (13 files now: added `cube3d.test.ts`, `Cube3D.test.tsx`, `SolveControls.test.tsx`).

- [ ] **Step 2: Production build**

Run: `npx vite build`
Expected: build succeeds; bundle includes three. Note bundle size increase (acceptable per spec).

- [ ] **Step 3: Manual QA in browser**

Run `npx vite dev`, paint a real scramble, hit 开始复原, verify:
- 3D cube renders with all 6 faces eventually visible via drag/orbit (R3F OrbitControls optional — add `<OrbitControls/>` from drei if not present; spec didn't require orbit but it helps "好看". **Decision:** add `OrbitControls` from drei, enable rotation, disable pan, limit zoom — improves the "好看" goal and is one line.)
- Each step animates the layer rotating; arrow appears on the turning face; `×2` shows on 180° turns.
- Speed slider changes the per-step duration live.
- Prev snaps back; Next/Play animate.
- 复原完成 shows at the end.

If OrbitControls added, include it in Task 7's drei mock (`OrbitControls: () => null`) and re-run tests.

- [ ] **Step 4: Update drei mock if OrbitControls added**

If `OrbitControls` is used in `Cube3D`, add to every `vi.mock('@react-three/drei', ...)`:
```ts
OrbitControls: () => null,
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(3d): orbit controls + final 3D solve demo polish"
```

---

## Self-Review Notes (for the executing agent)

- **Spec coverage:** mapping (T1), layer geometry + commit (T2), arrow (T3/T7), 3D render (T5), animation (T6), Solve rewire + step model (T8), speed slider 1–5s/0.5 default 2s (T9), deps (T4), verification (T10). Paint untouched ✓. strings centralized ✓.
- **Type consistency:** `CubieColor`, `cubiesFromState`, `applyLayerTurn`, `arrowSpec`, `animationProgress`, `isDone`, `arrowGeometry`, `cubieMeshData` — names used consistently across tasks. `Cube3D` props: `{ cube, pendingMove, stepMs, onAnimDone, moveNonce }` (moveNonce added in T8; ensure T6's `useEffect` watches it — flagged in T8).
- **Risk:** jsdom WebGL — mitigated by mocking `@react-three/fiber` Canvas/useFrame and `@react-three/drei`, testing pure helpers (`cubieMeshData`, `animationProgress`, `arrowGeometry`). Real WebGL verified manually in T10.
- **The single hardest invariant:** `applyLayerTurn` must match `applyMove` for all 6 faces × 3 dirs (T2 round-trip). If it fails, the cube visibly drifts from the engine's solution. Debug sign conventions there first.



