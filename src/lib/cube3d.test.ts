import { describe, it, expect } from 'vitest'
import type { CubeState, Face } from '../types'
import { cubiesFromState, applyLayerTurn, layerAxis, layerPositions, turnDirection, rotatePos, arrowSpec } from './cube3d'
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

describe('cube3d arrowSpec', () => {
  it('U1 → axis y, sign +1, sweep 1, ccw, not double', () => {
    const a = arrowSpec('U', 1)
    expect(a).toEqual({ face: 'U', axis: 'y', sign: 1, sweep: 1, visualDir: 'ccw', double: false })
  })

  it("U' → cw, not double", () => {
    const a = arrowSpec('U', -1)
    expect(a.visualDir).toBe('cw')
    expect(a.double).toBe(false)
    expect(a.sweep).toBe(1)
  })

  it('F2 → sweep 2, double', () => {
    const a = arrowSpec('F', 2)
    expect(a.axis).toBe('z')
    expect(a.sign).toBe(1)
    expect(a.sweep).toBe(2)
    expect(a.double).toBe(true)
  })

  it('R1 → axis x, sign +1', () => {
    const a = arrowSpec('R', 1)
    expect(a.axis).toBe('x')
    expect(a.sign).toBe(1)
    expect(a.visualDir).toBe('ccw')
  })

  it('D1 → axis y, sign -1', () => {
    const a = arrowSpec('D', 1)
    expect(a.axis).toBe('y')
    expect(a.sign).toBe(-1)
  })

  it('L1 → axis x, sign -1', () => {
    const a = arrowSpec('L', 1)
    expect(a.axis).toBe('x')
    expect(a.sign).toBe(-1)
  })

  it('B1 → axis z, sign -1', () => {
    const a = arrowSpec('B', 1)
    expect(a.axis).toBe('z')
    expect(a.sign).toBe(-1)
  })
})
