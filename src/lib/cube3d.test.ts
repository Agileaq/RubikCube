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
// ringArrowGeometry — tangential flow arrow on the ring side faces
// ---------------------------------------------------------------------------

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

// Flow table locked for ALL 6 faces × 3 directions, derived from the engine's
// own right-handed rotatePos — NOT by mirroring U's logic. The classic trap is
// encoded here: D (clockwise seen from below) flows F→R, the mirror image of
// U's F→L, because the default camera looks DOWN at U but UP through the cube
// at D.
const FLOW: [Face, 1 | -1 | 2, Face[]][] = [
  ['U', 1, ['F', 'L']], ['U', -1, ['F', 'R']], ['U', 2, ['F', 'L', 'B']],
  ['D', 1, ['F', 'R']], ['D', -1, ['F', 'L']], ['D', 2, ['F', 'R', 'B']],
  ['F', 1, ['U', 'R']], ['F', -1, ['U', 'L']], ['F', 2, ['U', 'R', 'D']],
  ['B', 1, ['U', 'L']], ['B', -1, ['U', 'R']], ['B', 2, ['U', 'L', 'D']],
  ['R', 1, ['U', 'B']], ['R', -1, ['U', 'F']], ['R', 2, ['U', 'B', 'D']],
  ['L', 1, ['U', 'F']], ['L', -1, ['U', 'B']], ['L', 2, ['U', 'F', 'D']],
]

describe('ringArrowGeometry flow table (right-hand rule locked per face)', () => {
  FLOW.forEach(([face, dir, expected]) => {
    const label = `${face}${dir === -1 ? "'" : dir === 2 ? '2' : ''}`
    it(`${label} flows ${expected.join('→')} across the ring side faces`, () => {
      const g = ringArrowGeometry(face, dir)
      expect(g.bars.map((b: RingBar) => faceOf(b.dims, b.pos))).toEqual(expected)
    })
  })
})

describe('ringArrowGeometry structure', () => {
  it('single turn: 2 bars; double turn: 3 bars', () => {
    expect(ringArrowGeometry('U', 1).bars).toHaveLength(2)
    expect(ringArrowGeometry('U', -1).bars).toHaveLength(2)
    expect(ringArrowGeometry('U', 2).bars).toHaveLength(3)
  })

  it('U1: tail bar runs edge-center→past-corner on F top row, head bar wraps onto L top row', () => {
    const g = ringArrowGeometry('U', 1)
    const [b0, b1] = g.bars
    // b0 on F top row: plane z=1.61 (sticker 1.59 + 0.02 clearance), spans x 0→-1.61
    expect(b0.pos[0]).toBeCloseTo(-0.805)
    expect(b0.pos[1]).toBeCloseTo(1.08)
    expect(b0.pos[2]).toBeCloseTo(1.61)
    expect(b0.dims).toEqual([1.61, 0.1, 0.02])
    // b1 on L top row: plane x=-1.61, spans z +1.61→0 (flow −z toward B)
    expect(b1.pos[0]).toBeCloseTo(-1.61)
    expect(b1.pos[1]).toBeCloseTo(1.08)
    expect(b1.pos[2]).toBeCloseTo(0.805)
    expect(b1.dims).toEqual([0.02, 0.1, 1.61])
  })

  it('corner continuity: consecutive bars physically overlap 0.01 past the cube edge — no black gap', () => {
    for (const [face, dir] of FLOW.map(([f, d]) => [f, d] as [Face, 1 | -1 | 2])) {
      const g = ringArrowGeometry(face, dir)
      // every bar reaches its corners at 1.61 from the edge center: tail bars
      // span 1.61 (center→corner), middle bars 3.22 (corner→corner), so the
      // perpendicular bars at each corner interpenetrate instead of butting.
      for (const b of g.bars) {
        const long = Math.max(...b.dims)
        expect([1.61, 3.22].some((e) => Math.abs(e - long) < 1e-9)).toBe(true)
      }
    }
  })

  it('U2 middle bar spans the full row corner-to-corner (3.22) centered on the middle edge', () => {
    const g = ringArrowGeometry('U', 2)
    expect(g.bars[1].dims).toEqual([0.02, 0.1, 3.22])
    expect(g.bars[1].pos[0]).toBeCloseTo(-1.61)
    expect(g.bars[1].pos[1]).toBeCloseTo(1.08)
    expect(g.bars[1].pos[2]).toBeCloseTo(0)
  })

  it('wings: exactly 2, on the last bar face, beyond its edge center along the flow, ±45° in-plane', () => {
    const g = ringArrowGeometry('U', 1)
    expect(g.wings).toHaveLength(2)
    for (const w of g.wings) {
      expect(faceOf(w.dims, w.pos)).toBe('L')
      expect(w.pos[0]).toBeCloseTo(-1.61)          // on the L face plane
      expect(w.pos[2]).toBeLessThan(0)             // past UL center along flow (−z)
      const nz = w.rot.filter((c) => Math.abs(c) > 1e-6)
      expect(nz).toHaveLength(1)                   // single-axis in-plane rotation
      expect(Math.abs(nz[0])).toBeCloseTo(Math.PI / 4)
    }
    const ys = g.wings.map((w: RingWing) => w.pos[1]).sort((a, b) => a - b)
    expect(ys[0] + ys[1]).toBeCloseTo(2 * 1.08)    // symmetric about the row
  })

  it('badge only for dir=2, on the middle edge side face, pushed to 1.64 (> bar outer face 1.62)', () => {
    for (const [face, dir, path] of FLOW) {
      const g = ringArrowGeometry(face, dir)
      if (dir !== 2) {
        expect(g.badge).toBeNull()
        continue
      }
      const badge = g.badge as RingBadge
      const ni = badgeMagAxis(badge)
      // badge face === middle path face (the edge the "2" is written on)
      const key = [0, 1, 2].map((i) => (i === ni ? (badge.pos[ni] >= 0 ? '1' : '-1') : '0')).join(',')
      expect(FACE_OF[key]).toBe(path[1])
      // normal axis offset = GAP 1.08 + 0.56 = 1.64, strictly outside the bar's
      // outer face at 1.08+0.53+0.01 = 1.62 (constraint: no z-fighting with the bar)
      expect(Math.abs(badge.pos[ni])).toBeCloseTo(1.64)
      expect(Math.abs(badge.pos[ni])).toBeGreaterThan(1.62)
    }
  })
})

function badgeMagAxis(b: RingBadge): number {
  const m = b.pos.map(Math.abs)
  return m[0] > m[1] && m[0] > m[2] ? 0 : m[1] > m[2] ? 1 : 2
}
