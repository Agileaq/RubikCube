import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { solve, STAGES, backwardMapStats } from './solver'
import type { Move } from '../types'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const flat = (steps: { moves: Move[] }[]) => steps.flatMap(s => s.moves)

describe('LBL solver', () => {
  it('exposes 7 stage labels', () => {
    expect(STAGES).toHaveLength(7)
    expect(STAGES[0]).toContain('白色十字')
  })

  // Memory regression guard: the eager prebuild must stay inside the budget a
  // phone browser can survive. Corner-involving backward maps are clamped to
  // depth 4 (depth 5 measured ~2GB heap on desktop — iOS Safari jetsammed the
  // tab before it finished, crashing the solve page in a reload loop).
  it('prebuilt backward maps stay within the mobile memory budget', () => {
    const { maps, entries } = backwardMapStats()
    expect(maps).toBe(12)
    expect(entries).toBeLessThan(400_000)
  })

  it('solving the solved cube yields no-op that stays solved', () => {
    const steps = solve(solvedCube())
    const end = applyMoves(solvedCube(), flat(steps))
    expect(eq(end, solvedCube())).toBe(true)
  })

  it('solves many random solvable scrambles', () => {
    const faces = ['U','D','L','R','F','B'] as const
    const dirs = [1,-1,2] as const
    let solvedCount = 0
    for (let t = 0; t < 30; t++) {
      const scramble: Move[] = Array.from({ length: 25 }, () => ({
        face: faces[Math.floor(Math.random()*6)],
        dir: dirs[Math.floor(Math.random()*3)],
      }))
      const start = applyMoves(solvedCube(), scramble)
      const steps = solve(start)
      const end = applyMoves(start, flat(steps))
      if (eq(end, solvedCube())) solvedCount++
    }
    expect(solvedCount).toBe(30)
  })

  it('groups moves under stage labels', () => {
    const start = applyMoves(solvedCube(), parseMoves("R U R' U' F2 L2 B D'"))
    const steps = solve(start)
    for (const s of steps) expect(STAGES).toContain(s.stage)
  })
})
