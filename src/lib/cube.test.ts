import { describe, it, expect } from 'vitest'
import { ADJACENT, CENTERS, FACES, emptyCube, solvedCube, cloneCube, remainingCounts, isFull, visibleFaces } from './cube'
import type { Face } from '../types'

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
    // Standard scheme: opposite pairs W↔Y, O↔R, G↔B (so orange and green are
    // ADJACENT, meeting at the visible corner — not opposite).
    expect(CENTERS.U).toBe('W'); expect(CENTERS.D).toBe('Y')
    expect(CENTERS.L).toBe('O'); expect(CENTERS.R).toBe('R')
    expect(CENTERS.F).toBe('G'); expect(CENTERS.B).toBe('B')
    // default corner shows white top, orange left, green right (U/L/F, adjacent)
    const d = visibleFaces('default')
    expect(CENTERS[d.top]).toBe('W')
    expect(CENTERS[d.left]).toBe('O')
    expect(CENTERS[d.right]).toBe('G')
    // flipped shows the opposite corner: yellow top, blue left, red right (D/B/R)
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

  it('over-filling a color goes negative (e.g. -1) as a warning', () => {
    // paint all 8 non-center L + R + F stickers orange → 24 orange placed, 8 allowed
    const c = emptyCube()
    for (const f of ['L','R','F'] as const) c[f].forEach((_, i) => { if (i !== 4) c[f][i] = 'O' })
    expect(remainingCounts(c).O).toBe(8 - 24) // -16, negative not floored at 0
    // one over: 9 orange placed → -1
    const d = emptyCube()
    let n = 0
    for (const f of ['L','R'] as const) d[f].forEach((_, i) => { if (i !== 4 && n < 9) { d[f][i] = 'O'; n++ } })
    expect(remainingCounts(d).O).toBe(-1)
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

// 方位十字与选面流程共用的观察朝向表：每个面的“正面视角”下四边各邻哪个面。
// 表值必须与 cubie.ts 的 CORNER_FACELETS/EDGE_FACELETS（toCubies 的输入）一致。
describe('ADJACENT (face-on viewing orientation)', () => {
  const OPP: Record<Face, Face> = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' }
  const DIRS = ['up', 'right', 'down', 'left'] as const

  it('is mutually consistent: every face named on F’s cross names F back on its own cross', () => {
    for (const f of FACES) {
      const cross = DIRS.map(d => ADJACENT[f][d])
      expect(new Set(cross).size).toBe(4)          // 4 个互不相同的邻面
      for (const g of cross) {
        expect(g).not.toBe(f)                      // 自身不相邻
        expect(g).not.toBe(OPP[f])                 // 对面不相邻
        // 几何对称：F 的某条边邻 G ⇔ G 的十字上也含 F。方向槽位由两面各自的
        // 正面视角决定（U.down=F ⇔ F.up=U，但 U.up=B ⇔ B.up=U），故按集合校验。
        expect(Object.values(ADJACENT[g])).toContain(f)
      }
    }
  })

  it('opposite faces never share a cross edge (W-Y, O-R, G-B center pairs)', () => {
    // 面对面相反 ⇔ 中心色相反：W-Y (U/D)、O-R (L/R)、G-B (F/B)
    for (const f of FACES) {
      for (const dir of DIRS) {
        const g = ADJACENT[f][dir]
        const pair = new Set([CENTERS[f], CENTERS[g]])
        expect(pair).not.toEqual(new Set(['W', 'Y']))
        expect(pair).not.toEqual(new Set(['O', 'R']))
        expect(pair).not.toEqual(new Set(['G', 'B']))
      }
    }
  })

  it('spot-checks pin all 24 slots against the toCubies corner groupings', () => {
    // 全部 24 槽位逐一钉死：每条边的邻面 = 该边两端两个角块组（cubie.ts
    // CORNER_FACELETS）中共同出现的面——任何两槽换位都逃不出这张网。
    // U：up=B via U2∈UBR[U2,B0,R2] + U0∈ULB[U0,L0,B2]；down=F via U8∈URF[U8,R0,F2] + U6∈UFL[U6,F0,L2]
    expect(ADJACENT.U.up).toBe('B')
    expect(ADJACENT.U.right).toBe('R')
    expect(ADJACENT.U.down).toBe('F')
    expect(ADJACENT.U.left).toBe('L')
    // D：up=F via D2∈DFR[D2,F8,R6] + D0∈DLF[D0,L8,F6]；down=B via D8∈DRB[D8,R8,B6] + D6∈DBL[D6,B8,L6]
    expect(ADJACENT.D.up).toBe('F')
    expect(ADJACENT.D.right).toBe('R')
    expect(ADJACENT.D.down).toBe('B')
    expect(ADJACENT.D.left).toBe('L')
    // F：up=U via F2∈URF[U8,R0,F2] + F0∈UFL[U6,F0,L2]；down=D via F8∈DFR[D2,F8,R6] + F6∈DLF[D0,L8,F6]
    expect(ADJACENT.F.up).toBe('U')
    expect(ADJACENT.F.right).toBe('R')
    expect(ADJACENT.F.down).toBe('D')
    expect(ADJACENT.F.left).toBe('L')
    // B：up=U via B2∈ULB[U0,L0,B2] + B0∈UBR[U2,B0,R2]；down=D via B8∈DBL[D6,B8,L6] + B6∈DRB[D8,R8,B6]
    expect(ADJACENT.B.up).toBe('U')
    expect(ADJACENT.B.right).toBe('L')
    expect(ADJACENT.B.down).toBe('D')
    expect(ADJACENT.B.left).toBe('R')
    // L：up=U via L2∈UFL[U6,F0,L2] + L0∈ULB[U0,L0,B2]；down=D via L8∈DLF[D0,L8,F6] + L6∈DBL[D6,B8,L6]
    expect(ADJACENT.L.up).toBe('U')
    expect(ADJACENT.L.right).toBe('F')
    expect(ADJACENT.L.down).toBe('D')
    expect(ADJACENT.L.left).toBe('B')
    // R：up=U via R2∈UBR[U2,B0,R2] + R0∈URF[U8,R0,F2]；down=D via R8∈DRB[D8,R8,B6] + R6∈DFR[D2,F8,R6]
    expect(ADJACENT.R.up).toBe('U')
    expect(ADJACENT.R.right).toBe('B')
    expect(ADJACENT.R.down).toBe('D')
    expect(ADJACENT.R.left).toBe('F')
  })
})
