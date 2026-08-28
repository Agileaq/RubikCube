import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { validate, UNSOLVABLE_MESSAGE, permutationParity } from './solvability'

describe('solvability', () => {
  it('solved cube is solvable', () => {
    expect(validate(solvedCube()).solvable).toBe(true)
  })

  it('any real scramble is solvable', () => {
    const c = applyMoves(solvedCube(), parseMoves("R U R' U' F2 B' L2 D R2 U'"))
    expect(validate(c).solvable).toBe(true)
  })

  it('a single twisted corner is unsolvable (co sum != 0 mod 3)', () => {
    const c = solvedCube()
    // rotate the URF corner stickers in place: U8->R0->F2->U8
    const u8 = c.U[8], r0 = c.R[0], f2 = c.F[2]
    c.U[8] = f2; c.R[0] = u8; c.F[2] = r0
    const res = validate(c)
    expect(res.solvable).toBe(false)
    expect(res.reason).toBe(UNSOLVABLE_MESSAGE)
  })

  it('a single flipped edge is unsolvable (eo sum != 0 mod 2)', () => {
    const c = solvedCube()
    const u5 = c.U[5], r1 = c.R[1]
    c.U[5] = r1; c.R[1] = u5 // flip UR edge
    expect(validate(c).solvable).toBe(false)
  })

  it('a single swap of two edges is unsolvable (parity mismatch)', () => {
    const c = solvedCube()
    // swap UR and UF edge pieces entirely (both stickers) -> odd edge perm, even corner perm
    ;[c.U[5], c.U[7]] = [c.U[7], c.U[5]]
    ;[c.R[1], c.F[1]] = [c.F[1], c.R[1]]
    expect(validate(c).solvable).toBe(false)
  })

  it('wrong color count is unsolvable', () => {
    const c = solvedCube(); c.U[0] = 'R' // now 8 W, 10 R
    expect(validate(c).solvable).toBe(false)
  })

  it('permutationParity: identity even, single swap odd', () => {
    expect(permutationParity([0,1,2,3])).toBe(0)
    expect(permutationParity([1,0,2,3])).toBe(1)
  })

  it('message is verbatim', () => {
    expect(UNSOLVABLE_MESSAGE).toBe('填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)')
  })
})
