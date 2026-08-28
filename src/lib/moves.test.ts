import { describe, it, expect } from 'vitest'
import { solvedCube, cloneCube } from './cube'
import { applyMove, applyMoves, parseMoves, invert } from './moves'
import type { Move } from '../types'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const FACES = ['U','D','L','R','F','B'] as const

describe('move engine', () => {
  it('parseMoves reads notation', () => {
    expect(parseMoves("R U R' U2")).toEqual<Move[]>([
      { face: 'R', dir: 1 }, { face: 'U', dir: 1 }, { face: 'R', dir: -1 }, { face: 'U', dir: 2 },
    ])
  })

  it('each quarter turn has order 4 (X X X X = identity)', () => {
    for (const face of FACES) {
      let c = solvedCube()
      for (let i = 0; i < 4; i++) c = applyMove(c, { face, dir: 1 })
      expect(eq(c, solvedCube())).toBe(true)
    }
  })

  it('a move times its inverse is identity', () => {
    for (const face of FACES) {
      const c = applyMoves(solvedCube(), [{ face, dir: 1 }, { face, dir: -1 }])
      expect(eq(c, solvedCube())).toBe(true)
      const d = applyMoves(solvedCube(), [{ face, dir: 2 }, { face, dir: 2 }])
      expect(eq(d, solvedCube())).toBe(true)
    }
  })

  it('a single R turn changes the cube and keeps all centers fixed', () => {
    const c = applyMove(solvedCube(), { face: 'R', dir: 1 })
    expect(eq(c, solvedCube())).toBe(false)
    for (const f of FACES) expect(c[f][4]).toBe(solvedCube()[f][4]) // centers unmoved
  })

  it('invert reverses and flips a sequence', () => {
    const seq = parseMoves("R U R' U'")
    const c = applyMoves(applyMoves(solvedCube(), seq), invert(seq))
    expect(eq(c, solvedCube())).toBe(true)
  })

  it('the 6-move sequence (R U R U R U R U R U R U... ) sexy move has order 6', () => {
    // (R U R' U') repeated 6 times returns to solved — classic commutator order
    let c = cloneCube(solvedCube())
    const sexy = parseMoves("R U R' U'")
    for (let i = 0; i < 6; i++) c = applyMoves(c, sexy)
    expect(eq(c, solvedCube())).toBe(true)
  })
})
