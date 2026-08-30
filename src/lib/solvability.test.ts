import { describe, it, expect } from 'vitest'
import type { Color, CubeState, Face } from '../types'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { validate, UNSOLVABLE_MESSAGE, permutationParity } from './solvability'

function fromCode(s: string): CubeState {
  const c = {} as CubeState
  for (const p of s.split('|')) {
    const [f, cs] = p.split(':')
    c[f as Face] = cs.split('') as Color[]
  }
  return c
}

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
    expect(res.detail).toContain('原地扭转')
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

  it('impossible fill reports duplicated/missing pieces and their slots', () => {
    // state with duplicated corner/edge pieces and missing ones
    const c = fromCode('U:OWWOWWOWW|D:YYRYYRYYR|L:GGGOOYBBB|R:BBBWRRGGG|F:WRRGGGOOY|B:RRWBBBYOO')
    const res = validate(c)
    expect(res.solvable).toBe(false)
    expect(res.reason).toBe(UNSOLVABLE_MESSAGE)
    expect(res.detail).toContain('白蓝红×2(在U·R·F、U·B·R两处)')
    expect(res.detail).toContain('白绿橙×2(在U·F·L、U·L·B两处)')
    expect(res.detail).toContain('缺失角块:白红绿')
    expect(res.detail).toContain('缺失角块:白橙蓝')
    expect(res.detail).toContain('白红×2(在U·F、U·B两处)')
    expect(res.detail).toContain('黄橙×2(在D·F、D·B两处)')
    expect(res.detail).toContain('缺失棱块:白橙')
    expect(res.detail).toContain('缺失棱块:黄红')
  })

  it('message is verbatim and detail is undefined when solvable', () => {
    expect(UNSOLVABLE_MESSAGE).toBe('填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)')
    const res = validate(solvedCube())
    expect(res.solvable).toBe(true)
    expect(res.reason).toBeUndefined()
    expect(res.detail).toBeUndefined()
  })
})
