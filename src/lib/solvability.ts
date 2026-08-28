import type { CubeState, Color } from '../types'
import { FACES, COLORS } from './cube'
import { toCubies } from './cubie'

export const UNSOLVABLE_MESSAGE =
  '填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)'

export function permutationParity(perm: number[]): 0 | 1 {
  const seen = new Array(perm.length).fill(false)
  let transpositions = 0
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue
    let j = i, len = 0
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++ }
    transpositions += len - 1
  }
  return (transpositions % 2) as 0 | 1
}

function colorCountsOk(c: CubeState): boolean {
  const n: Record<Color, number> = { W: 0, R: 0, O: 0, Y: 0, G: 0, B: 0 }
  for (const f of FACES) for (const x of c[f]) { if (!x) return false; n[x] += 1 }
  return COLORS.every(col => n[col] === 9)
}

export function validate(c: CubeState): { solvable: boolean; reason?: string } {
  const fail = { solvable: false, reason: UNSOLVABLE_MESSAGE }
  if (!colorCountsOk(c)) return fail
  const q = toCubies(c)
  if (!q) return fail
  if (q.co.reduce((a, b) => a + b, 0) % 3 !== 0) return fail
  if (q.eo.reduce((a, b) => a + b, 0) % 2 !== 0) return fail
  if (permutationParity(q.cp) !== permutationParity(q.ep)) return fail
  return { solvable: true }
}
