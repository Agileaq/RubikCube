import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { toCubies } from './cubie'

describe('facelet -> cubie', () => {
  it('solved cube maps to identity cubies', () => {
    const q = toCubies(solvedCube())!
    expect(q.cp).toEqual([0,1,2,3,4,5,6,7])
    expect(q.co).toEqual([0,0,0,0,0,0,0,0])
    expect(q.ep).toEqual([0,1,2,3,4,5,6,7,8,9,10,11])
    expect(q.eo).toEqual([0,0,0,0,0,0,0,0,0,0,0,0])
  })

  it('a scramble stays a legal (non-null) cubie set', () => {
    const c = applyMoves(solvedCube(), parseMoves("R U R' U' F2 L D"))
    const q = toCubies(c)
    expect(q).not.toBeNull()
    // permutations are genuine permutations of 0..7 and 0..11
    expect([...q!.cp].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7])
    expect([...q!.ep].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8,9,10,11])
  })

  it('orientation sums are valid for a real scramble', () => {
    const c = applyMoves(solvedCube(), parseMoves("R U R' U' R U2 R' F R F'"))
    const q = toCubies(c)!
    expect(q.co.reduce((a,b)=>a+b,0) % 3).toBe(0)
    expect(q.eo.reduce((a,b)=>a+b,0) % 2).toBe(0)
  })

  it('returns null for an impossible cubie (opposite colors on one corner)', () => {
    const bad = solvedCube()
    // force a corner to carry W and Y (opposite pair) — illegal cubie
    bad.U[0] = 'W'; bad.L[0] = 'Y'; bad.B[2] = 'W'
    expect(toCubies(bad)).toBeNull()
  })
})
