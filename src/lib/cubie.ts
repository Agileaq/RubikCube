import type { CubeState, Color, Face } from '../types'
import { CENTERS } from './cube'

export interface Cubies { cp: number[]; co: number[]; ep: number[]; eo: number[] }

// Facelet positions for each corner/edge slot, standard URFDLB scheme.
// Corner order: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
export const CORNER_FACELETS: [Face, number][][] = [
  [['U',8],['R',0],['F',2]], [['U',6],['F',0],['L',2]], [['U',0],['L',0],['B',2]], [['U',2],['B',0],['R',2]],
  [['D',2],['F',8],['R',6]], [['D',0],['L',8],['F',6]], [['D',6],['B',8],['L',6]], [['D',8],['R',8],['B',6]],
]
// Edge order: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
export const EDGE_FACELETS: [Face, number][][] = [
  [['U',5],['R',1]], [['U',7],['F',1]], [['U',3],['L',1]], [['U',1],['B',1]],
  [['D',5],['R',7]], [['D',1],['F',7]], [['D',3],['L',7]], [['D',7],['B',7]],
  [['F',5],['R',3]], [['F',3],['L',5]], [['B',5],['L',3]], [['B',3],['R',5]],
]

const U = CENTERS.U, D = CENTERS.D
const key = (cs: (Color|null)[]) => cs.some(x=>x===null) ? null : [...cs].sort().join('')

function refSets(facelets: [Face, number][][]) {
  return facelets.map(cubie => cubie.map(([f]) => CENTERS[f]))
}
export const CORNER_REF = refSets(CORNER_FACELETS)
export const EDGE_REF = refSets(EDGE_FACELETS)
const cornerKey = (i: number) => [...CORNER_REF[i]].sort().join('')
const edgeKey = (i: number) => [...EDGE_REF[i]].sort().join('')

export function toCubies(c: CubeState): Cubies | null {
  const cp = new Array(8).fill(-1), co = new Array(8).fill(0)
  const ep = new Array(12).fill(-1), eo = new Array(12).fill(0)

  for (let slot = 0; slot < 8; slot++) {
    const cols = CORNER_FACELETS[slot].map(([f,i]) => c[f][i]) as (Color|null)[]
    const k = key(cols); if (!k) return null
    const piece = CORNER_REF.findIndex((_, i) => cornerKey(i) === k)
    if (piece < 0) return null
    cp[slot] = piece
    // orientation = index (0..2) of the U/D-colored sticker within this slot's facelets
    const oi = cols.findIndex(x => x === U || x === D)
    if (oi < 0) return null
    co[slot] = oi
  }

  for (let slot = 0; slot < 12; slot++) {
    const cols = EDGE_FACELETS[slot].map(([f,i]) => c[f][i]) as (Color|null)[]
    const k = key(cols); if (!k) return null
    const piece = EDGE_REF.findIndex((_, i) => edgeKey(i) === k)
    if (piece < 0) return null
    ep[slot] = piece
    // eo = 0 if the "primary" colored sticker sits on the primary facelet, else 1.
    // Primary color of an edge piece = its U/D color if it has one, else its F/B color.
    const primaryColor = EDGE_REF[piece].find(x => x === U || x === D)
      ?? EDGE_REF[piece].find(x => x === CENTERS.F || x === CENTERS.B)!
    eo[slot] = cols[0] === primaryColor ? 0 : 1
  }

  // validate permutations are complete
  if (new Set(cp).size !== 8 || cp.includes(-1)) return null
  if (new Set(ep).size !== 12 || ep.includes(-1)) return null
  return { cp, co, ep, eo }
}
