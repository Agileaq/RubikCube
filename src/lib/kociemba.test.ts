import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { solveFast } from './kociemba'
import type { Move } from '../types'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

describe('kociemba adapter', () => {
  // The adapter feeds our cubie model straight into cubejs's Cube. These
  // round-trips are the contract: whatever the solver returns must restore
  // the exact input state through OUR move engine — a slot-convention or
  // orientation mismatch anywhere shows up here.
  it('solves random scrambles; applying the solution restores the state', async () => {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'] as const
    const dirs = [1, -1, 2] as const
    for (let t = 0; t < 5; t++) {
      const scramble: Move[] = Array.from({ length: 25 }, () => ({
        face: faces[Math.floor(Math.random() * 6)],
        dir: dirs[Math.floor(Math.random() * 3)],
      }))
      const start = applyMoves(solvedCube(), scramble)
      const solution = await solveFast(start)
      expect(solution.length).toBeLessThanOrEqual(25)
      // the solution SOLVES the scrambled state
      expect(eq(applyMoves(start, solution), solvedCube())).toBe(true)
    }
  }, 180_000)

  it('solves a fixed scramble in at most 25 moves', async () => {
    const start = applyMoves(solvedCube(), parseMoves("R U R' U' F2 L D B' R2 U' F B'"))
    const solution = await solveFast(start)
    expect(solution.length).toBeLessThanOrEqual(25)
    expect(eq(applyMoves(start, solution), solvedCube())).toBe(true)
  }, 180_000)

  it('yields no moves for a solved cube', async () => {
    expect(await solveFast(solvedCube())).toEqual([])
  }, 180_000)
})
