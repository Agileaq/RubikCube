import { describe, it, expect } from 'vitest'
import type { CubeState, Face } from '../types'
import { cubiesFromState, applyLayerTurn, layerAxis, layerPositions, turnDirection, rotatePos, ringArrowGeometry } from './cube3d'
import type { RingBar, RingWing, RingBadge } from './cube3d'
import { solvedCube } from './cube'
import { applyMove, applyMoves, parseMoves } from './moves'

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

  it('after a U move, the URF-position cubie keeps white on +y (top face turns in its own plane)', () => {
    const after = applyMoves(solvedCube(), parseMoves('U'))
    const cs = cubiesFromState(after)
    const urf = find(cs, 1, 1, 1)
    const labels = ['R','L','U','D','F','B'] as const
    expect(urf.colors[labels.indexOf('U')]).toBe('W')
  })
})

describe('cube3d layer geometry', () => {
  it('layerAxis maps U/D→y, R/L→x, F/B→z', () => {
    expect(layerAxis('U')).toBe('y')
    expect(layerAxis('D')).toBe('y')
    expect(layerAxis('R')).toBe('x')
    expect(layerAxis('L')).toBe('x')
    expect(layerAxis('F')).toBe('z')
    expect(layerAxis('B')).toBe('z')
  })

  it('layerPositions returns the 9 positions of the rotated layer', () => {
    expect(layerPositions('U')).toHaveLength(9)
    expect(layerPositions('D')).toHaveLength(9)
    expect(layerPositions('R')).toHaveLength(9)
    expect(layerPositions('L')).toHaveLength(9)
    expect(layerPositions('F')).toHaveLength(9)
    expect(layerPositions('B')).toHaveLength(9)
  })

  it('layerPositions(U) all have y=+1; layerPositions(F) all have z=+1', () => {
    expect(layerPositions('U').every(p => p[1] === 1)).toBe(true)
    expect(layerPositions('D').every(p => p[1] === -1)).toBe(true)
    expect(layerPositions('R').every(p => p[0] === 1)).toBe(true)
    expect(layerPositions('L').every(p => p[0] === -1)).toBe(true)
    expect(layerPositions('F').every(p => p[2] === 1)).toBe(true)
    expect(layerPositions('B').every(p => p[2] === -1)).toBe(true)
  })

  it('turnDirection reports signed quarterTurns', () => {
    expect(turnDirection('U', 1).quarterTurns).toBe(-1)
    expect(turnDirection('U', -1).quarterTurns).toBe(1)
    expect(turnDirection('U', 2).quarterTurns).toBe(2)
    expect(turnDirection('D', 1).quarterTurns).toBe(1)
    expect(turnDirection('F', 2).quarterTurns).toBe(2)
  })

  it('rotatePos does integer 90° right-handed rotations about each axis', () => {
    expect(rotatePos([1, 0, 0], 'z', 1)).toEqual([0, 1, 0])
    expect(rotatePos([0, 1, 0], 'z', 1)).toEqual([-1, 0, 0])
    expect(rotatePos([1, 0, 0], 'y', 1)).toEqual([0, 0, -1])
    expect(rotatePos([0, 0, 1], 'y', 1)).toEqual([1, 0, 0])
    expect(rotatePos([0, 1, 0], 'x', 1)).toEqual([0, 0, 1])
    expect(rotatePos([0, 0, 1], 'x', 1)).toEqual([0, -1, 0])
    // 180°
    expect(rotatePos([1, 2, 3], 'x', 2)).toEqual([1, -2, -3])
  })
})

describe('cube3d applyLayerTurn vs engine (scrambled round-trip)', () => {
  const FACES: Face[] = ['U','D','L','R','F','B']
  const DIRS: (1|-1|2)[] = [1,-1,2]
  const eq = (a:CubeState,b:CubeState) =>
    (['U','D','L','R','F','B'] as Face[]).every(f => a[f].every((c,i)=>c===b[f][i]))

  it('applyLayerTurn matches applyMove on SCRAMBLED cubes (all 6 faces × 3 dirs × 5 starts)', () => {
    const starts = [
      solvedCube(),
      applyMove(solvedCube(), {face:'U',dir:1}),
      applyMoves(solvedCube(), parseMoves('U R')),
      applyMoves(solvedCube(), parseMoves('F R U')),
      applyMoves(solvedCube(), parseMoves("R U R' U' F2 B' L2 D R2 U'")),
    ]
    let fail = 0
    const fails: string[] = []
    for (const s of starts) for (const f of FACES) for (const d of DIRS) {
      if (!eq(applyMove(s, {face:f, dir:d}), applyLayerTurn(s, f, d))) {
        fail++
        fails.push(`${f}${d===-1?"'":d===2?'2':''}`)
      }
    }
    expect({ fail, sample: fails.slice(0,8) }).toEqual({ fail: 0, sample: [] })
  })
})

// ---------------------------------------------------------------------------
// ringArrowGeometry — per-face flow arrows on the turning layer's ring
// ---------------------------------------------------------------------------
// Design: the 4 side faces of the turning layer each carry ONE purple arrow
// spanning that face's full 3-sticker row (corner-edge-corner). For double
// turns the shaft splits around the middle block and a purple "2" sits in the
// gap, integrated into the arrow.

// The world face an element lies on, derived from its thinnest box dimension
// (the 0.02 thickness axis is the face normal; pos sign picks the side).
const FACE_OF: Record<string, Face> = {
  '1,0,0': 'R', '-1,0,0': 'L', '0,1,0': 'U', '0,-1,0': 'D', '0,0,1': 'F', '0,0,-1': 'B',
}
function faceOf(dims: number[], pos: number[]): Face {
  const ai = dims.findIndex((d) => Math.abs(d - 0.02) < 1e-6)
  const key = [0, 1, 2].map((i) => (i === ai ? (pos[ai] >= 0 ? '1' : '-1') : '0')).join(',')
  return FACE_OF[key]
}

// All 6 faces × 3 directions. Direction expectations are derived from the
// ENGINE's own right-handed turnDirection — NOT by mirroring U's logic. The
// classic trap is encoded in the literal spot-checks below: D (clockwise seen
// from below) flows F→R, the mirror image of U's F→L, because the default
// camera looks DOWN at U but UP through the cube at D.
const FLOW: [Face, 1 | -1 | 2][] = []
for (const f of ['U', 'D', 'F', 'B', 'R', 'L'] as Face[])
  for (const d of [1, -1, 2] as const) FLOW.push([f, d])

const AXIS_UNIT: Record<'x' | 'y' | 'z', [number, number, number]> = {
  x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1],
}
const crossT = (a: number[], b: number[]) => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
]
// side-face normal of a ring edge (nonzero coordinate other than the layer axis)
function sideNormalOf(p: number[], axis: 'x' | 'y' | 'z'): string {
  const [x, y, z] = p
  if (axis === 'x') return y !== 0 ? `0,${y},0` : `0,0,${z}`
  if (axis === 'y') return x !== 0 ? `${x},0,0` : `0,0,${z}`
  return x !== 0 ? `${x},0,0` : `0,${y},0`
}
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

describe('ringArrowGeometry — one arrow per ring face, flow locked per face', () => {
  FLOW.forEach(([face, dir]) => {
    const label = `${face}${dir === -1 ? "'" : dir === 2 ? '2' : ''}`
    it(`${label}: 4 shafts cover the ring faces, each head at the engine's flow end`, () => {
      const g = ringArrowGeometry(face, dir)
      const { axis, quarterTurns } = turnDirection(face, dir)
      // step = sign of the engine's quarterTurns — the layer's ACTUAL animated
      // rotation. For dir=2 that is +2 about +axis, so the arrows must flow the
      // way the layer visibly turns (this caught the U2/F2/R2 inversion bug).
      const step = Math.sign(quarterTurns) || 1
      const edges = layerPositions(face).filter((p) => p.filter((c) => c !== 0).length === 2)
      expect(edges).toHaveLength(4)

      for (const p of edges) {
        const t = crossT(AXIS_UNIT[axis], p).map((c) => c * step)
        const f = FACE_OF[sideNormalOf(p, axis)]
        const shafts = g.bars.filter((b: RingBar) => faceOf(b.dims, b.pos) === f)
        const heads = g.wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === f)
        expect(shafts).toHaveLength(dir === 2 ? 2 : 1)
        expect(heads).toHaveLength(2)

        const center = p.map((c) => c * 1.08)
        // chevron sits past the edge center along the flow, at the row's end
        for (const w of heads) expect(dot(w.pos.map((c, i) => c - center[i]), t)).toBeGreaterThan(1.0)
        // shaft ends and chevron tip pull in at 1.45 (corner tip 1.62) — each
        // arrow's head and the next arrow's tail keep a breathing gap
        for (const s of shafts) {
          const long = Math.max(...s.dims)
          const along = Math.abs(dot(s.pos.map((c, i) => c - center[i]), t))
          expect(along + long / 2).toBeCloseTo(1.45)
        }
        // wings ride one layer outside the shaft plane — no coplanar z-fighting
        const ni = sideNormalOf(p, axis).split(',').findIndex((c) => c !== '0')
        const shaftOff = Math.abs(shafts[0].pos[ni])
        for (const w of heads) expect(Math.abs(w.pos[ni])).toBeCloseTo(shaftOff + 0.03)
      }
    })
  })

  it('literal trap: U1 F-row head points −x (toward L); D1 F-row head points +x (toward R)', () => {
    const u1 = ringArrowGeometry('U', 1)
    for (const w of u1.wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'F'))
      expect(w.pos[0]).toBeLessThan(-1.2)
    const d1 = ringArrowGeometry('D', 1)
    for (const w of d1.wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'F'))
      expect(w.pos[0]).toBeGreaterThan(1.2)
  })

  it('literal trap: B1 U-row head points −x; F1 U-row head points +x', () => {
    for (const w of ringArrowGeometry('B', 1).wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'U'))
      expect(w.pos[0]).toBeLessThan(-1.2)
    for (const w of ringArrowGeometry('F', 1).wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'U'))
      expect(w.pos[0]).toBeGreaterThan(1.2)
  })

  it('literal regression: dir=2 arrows flow with the animated +2 rotation (U2/F2/R2 were inverted)', () => {
    // U2: layer turns +2 about +y → at UF the flow runs +x (F-row head toward R)
    for (const w of ringArrowGeometry('U', 2).wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'F'))
      expect(w.pos[0]).toBeGreaterThan(1.2)
    // R2: layer turns +2 about +x → at UR the flow runs +z (U-row head toward F)
    for (const w of ringArrowGeometry('R', 2).wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'U'))
      expect(w.pos[2]).toBeGreaterThan(1.2)
    // F2: layer turns +2 about +z → at UF the flow runs −x (U-row head toward L)
    for (const w of ringArrowGeometry('F', 2).wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'U'))
      expect(w.pos[0]).toBeLessThan(-1.2)
  })
})

describe('ringArrowGeometry structure', () => {
  it('single turn: 4 shafts + 8 wings, no badge; double turn: 8 shafts + 8 wings + 4 badges', () => {
    for (const d of [1, -1] as const) {
      const g = ringArrowGeometry('U', d)
      expect(g.bars).toHaveLength(4)
      expect(g.wings).toHaveLength(8)
      expect(g.badges).toHaveLength(0)
    }
    const g2 = ringArrowGeometry('U', 2)
    expect(g2.bars).toHaveLength(8)
    expect(g2.wings).toHaveLength(8)
    expect(g2.badges).toHaveLength(4)
  })

  it('U1: F-row shaft spans the 3-block row (2.9, ends pulled in) at z=1.61; L-row shaft likewise', () => {
    const g = ringArrowGeometry('U', 1)
    const f = g.bars.find((b: RingBar) => faceOf(b.dims, b.pos) === 'F')!
    expect(f.pos).toEqual([expect.closeTo(0), expect.closeTo(1.08), expect.closeTo(1.61)])
    expect(f.dims).toEqual([2.9, 0.1, 0.02])
    const l = g.bars.find((b: RingBar) => faceOf(b.dims, b.pos) === 'L')!
    expect(l.dims).toEqual([0.02, 0.1, 2.9])
  })

  it('U2: shaft splits around the middle block — two 1.15 segments flanking a 0.6 gap', () => {
    const g = ringArrowGeometry('U', 2)
    const fSegs = g.bars.filter((b: RingBar) => faceOf(b.dims, b.pos) === 'F')
    expect(fSegs.map((s) => s.dims[0]).sort((a, b) => a - b)).toEqual([1.15, 1.15])
    const xs = fSegs.map((s) => s.pos[0]).sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(-0.875)
    expect(xs[1]).toBeCloseTo(0.875)
  })

  it('U2 badges: one per ring face at the middle block, 1.64 off the core (> shaft outer 1.62)', () => {
    const g = ringArrowGeometry('U', 2)
    const faces = g.badges.map((b: RingBadge) => {
      const ni = badgeMagAxis(b)
      expect(Math.abs(b.pos[ni])).toBeCloseTo(1.64)
      expect(Math.abs(b.pos[ni])).toBeGreaterThan(1.62)
      return FACE_OF[[0, 1, 2].map((i) => (i === ni ? (b.pos[ni] >= 0 ? '1' : '-1') : '0')).join(',')]
    })
    expect([...faces].sort()).toEqual(['B', 'F', 'L', 'R'])
    const fb = g.badges.find((b: RingBadge) => badgeMagAxis(b) === 2)!
    expect(fb.pos).toEqual([expect.closeTo(0), expect.closeTo(1.08), expect.closeTo(1.64)])
  })

  it('U1 wings: single-axis ±45° in-plane rotation, symmetric about the row', () => {
    const g = ringArrowGeometry('U', 1)
    const lw = g.wings.filter((w: RingWing) => faceOf(w.dims, w.pos) === 'L')
    expect(lw).toHaveLength(2)
    for (const w of lw) {
      const nz = w.rot.filter((c) => Math.abs(c) > 1e-6)
      expect(nz).toHaveLength(1)
      expect(Math.abs(nz[0])).toBeCloseTo(Math.PI / 4)
    }
    const ys = lw.map((w: RingWing) => w.pos[1]).sort((a, b) => a - b)
    expect(ys[0] + ys[1]).toBeCloseTo(2 * 1.08)
  })
})

function badgeMagAxis(b: RingBadge): number {
  const m = b.pos.map(Math.abs)
  return m[0] > m[1] && m[0] > m[2] ? 0 : m[1] > m[2] ? 1 : 2
}
