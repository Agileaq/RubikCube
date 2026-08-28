import type { CubeState, Face, Move } from '../types'
import { cloneCube } from './cube'

type Pos = [Face, number]
// Each entry is one 4-cycle: value at pos[i] moves to pos[i+1] on a cw turn.
// Includes the 8 face stickers (0-3,5-8) plus the 12 adjacent side stickers.
const CYCLES: Record<Face, Pos[][]> = {
  U: [
    [['U',0],['U',2],['U',8],['U',6]], [['U',1],['U',5],['U',7],['U',3]],
    [['B',0],['R',0],['F',0],['L',0]], [['B',1],['R',1],['F',1],['L',1]], [['B',2],['R',2],['F',2],['L',2]],
  ],
  D: [
    [['D',0],['D',2],['D',8],['D',6]], [['D',1],['D',5],['D',7],['D',3]],
    [['F',6],['R',6],['B',6],['L',6]], [['F',7],['R',7],['B',7],['L',7]], [['F',8],['R',8],['B',8],['L',8]],
  ],
  F: [
    [['F',0],['F',2],['F',8],['F',6]], [['F',1],['F',5],['F',7],['F',3]],
    [['U',6],['R',0],['D',2],['L',8]], [['U',7],['R',3],['D',1],['L',5]], [['U',8],['R',6],['D',0],['L',2]],
  ],
  B: [
    [['B',0],['B',2],['B',8],['B',6]], [['B',1],['B',5],['B',7],['B',3]],
    [['U',2],['L',0],['D',6],['R',8]], [['U',1],['L',3],['D',7],['R',5]], [['U',0],['L',6],['D',8],['R',2]],
  ],
  L: [
    [['L',0],['L',2],['L',8],['L',6]], [['L',1],['L',5],['L',7],['L',3]],
    [['U',0],['F',0],['D',0],['B',8]], [['U',3],['F',3],['D',3],['B',5]], [['U',6],['F',6],['D',6],['B',2]],
  ],
  R: [
    [['R',0],['R',2],['R',8],['R',6]], [['R',1],['R',5],['R',7],['R',3]],
    [['U',8],['B',0],['D',8],['F',8]], [['U',5],['B',3],['D',5],['F',5]], [['U',2],['B',6],['D',2],['F',2]],
  ],
}

function turnCW(c: CubeState, face: Face): CubeState {
  const out = cloneCube(c)
  for (const cycle of CYCLES[face]) {
    const n = cycle.length
    for (let i = 0; i < n; i++) {
      const [df, di] = cycle[(i + 1) % n]
      const [sf, si] = cycle[i]
      out[df][di] = c[sf][si]
    }
  }
  return out
}

export function applyMove(c: CubeState, m: Move): CubeState {
  const times = m.dir === -1 ? 3 : m.dir === 2 ? 2 : 1
  let out = c
  for (let i = 0; i < times; i++) out = turnCW(out, m.face)
  return out
}

export function applyMoves(c: CubeState, ms: Move[]): CubeState {
  return ms.reduce(applyMove, c)
}

export function parseMoves(s: string): Move[] {
  return s.trim().split(/\s+/).filter(Boolean).map(tok => {
    const face = tok[0] as Face
    const dir = tok.includes('2') ? 2 : tok.includes("'") ? -1 : 1
    return { face, dir } as Move
  })
}

export function invert(ms: Move[]): Move[] {
  return [...ms].reverse().map(m => ({ face: m.face, dir: (m.dir === 2 ? 2 : (m.dir === 1 ? -1 : 1)) as Move['dir'] }))
}
