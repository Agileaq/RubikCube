import { describe, it, expect } from 'vitest'
import { CENTERS, emptyCube, solvedCube, cloneCube, remainingCounts, isFull, visibleFaces } from './cube'

describe('cube model', () => {
  it('empty cube has 6 fixed centers and 48 nulls', () => {
    const c = emptyCube()
    const faces = ['U','D','L','R','F','B'] as const
    let nulls = 0
    for (const f of faces) {
      expect(c[f]).toHaveLength(9)
      expect(c[f][4]).toBe(CENTERS[f])
      nulls += c[f].filter(x => x === null).length
    }
    expect(nulls).toBe(48)
  })

  it('center colors satisfy required orientations (req 4 & 5)', () => {
    // default exposes U=W, L=O, R=G
    expect(CENTERS.U).toBe('W'); expect(CENTERS.L).toBe('O'); expect(CENTERS.R).toBe('G')
    // flipped exposes top=D=Y, left=B=B, right=F=R
    const v = visibleFaces('flipped')
    expect(CENTERS[v.top]).toBe('Y')
    expect(CENTERS[v.left]).toBe('B')
    expect(CENTERS[v.right]).toBe('R')
  })

  it('solved cube is full and has 9 of each; remaining all 0', () => {
    const s = solvedCube()
    expect(isFull(s)).toBe(true)
    const r = remainingCounts(s)
    expect(r).toEqual({ W:0, R:0, O:0, Y:0, G:0, B:0 })
  })

  it('empty cube remaining is 8 for every color', () => {
    expect(remainingCounts(emptyCube())).toEqual({ W:8, R:8, O:8, Y:8, G:8, B:8 })
  })

  it('cloneCube is a deep copy', () => {
    const a = emptyCube(); const b = cloneCube(a); b.U[0] = 'R'
    expect(a.U[0]).toBe(null)
  })

  it('isFull false when any null', () => {
    const c = solvedCube(); c.U[0] = null
    expect(isFull(c)).toBe(false)
  })
})
