import type { CubeState, Color } from '../types'
import { FACES, COLORS } from './cube'
import { CORNER_FACELETS, EDGE_FACELETS, CORNER_REF, EDGE_REF } from './cubie'

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

// Piece names for diagnostics: corners by their three colors, edges by two.
const COLOR_NAME: Record<Color, string> = { W: '白', R: '红', O: '橙', Y: '黄', G: '绿', B: '蓝' }
const cornerName = (i: number) => CORNER_REF[i].map(x => COLOR_NAME[x]).join('')
const edgeName = (i: number) => EDGE_REF[i].map(x => COLOR_NAME[x]).join('')
const slotName = (fs: [face: string, n: number][]) => fs.map(([f]) => f).join('·')

export function validate(c: CubeState): { solvable: boolean; reason?: string; detail?: string } {
  const fail = (reason: string = UNSOLVABLE_MESSAGE, detail?: string) => ({ solvable: false, reason, detail })
  if (!colorCountsOk(c)) return fail()

  // Match every corner/edge slot to a real piece (arrays stay slot-aligned),
  // then report impossible combos and duplicated/missing pieces with the
  // exact slots involved, so a wrong fill points at the stickers to recheck.
  const cp = new Array(8).fill(-1), co = new Array(8).fill(0)
  const badC: string[] = []
  CORNER_FACELETS.forEach((slot, s) => {
    const cols = slot.map(([f, i]) => c[f][i]) as Color[]
    const k = [...cols].sort().join('')
    const piece = CORNER_REF.findIndex(ref => [...ref].sort().join('') === k)
    const oi = cols.findIndex(x => x === 'W' || x === 'Y')
    if (piece < 0 || oi < 0) {
      badC.push(`${slotName(slot)}角读到的颜色(${cols.map(x => COLOR_NAME[x]).join('')})不对应任何真实角块`)
      return
    }
    cp[s] = piece; co[s] = oi
  })
  const ep = new Array(12).fill(-1), eo = new Array(12).fill(0)
  const badE: string[] = []
  EDGE_FACELETS.forEach((slot, s) => {
    const cols = slot.map(([f, i]) => c[f][i]) as Color[]
    const k = [...cols].sort().join('')
    const piece = EDGE_REF.findIndex(ref => [...ref].sort().join('') === k)
    if (piece < 0) {
      badE.push(`${slotName(slot)}棱读到的颜色(${cols.map(x => COLOR_NAME[x]).join('')})不对应任何真实棱块`)
      return
    }
    const pc = EDGE_REF[piece].find(x => x === 'W' || x === 'Y')
      ?? EDGE_REF[piece].find(x => x === 'G' || x === 'B')!
    ep[s] = piece; eo[s] = cols[0] === pc ? 0 : 1
  })

  const dupC: string[] = [], missC: string[] = []
  for (let i = 0; i < 8; i++) {
    const at = cp.map((p, s) => (p === i ? slotName(CORNER_FACELETS[s]) : null)).filter(Boolean) as string[]
    if (at.length > 1) dupC.push(`${cornerName(i)}×${at.length}(在${at.join('、')}两处)`)
    if (at.length === 0) missC.push(cornerName(i))
  }
  const dupE: string[] = [], missE: string[] = []
  for (let i = 0; i < 12; i++) {
    const at = ep.map((p, s) => (p === i ? slotName(EDGE_FACELETS[s]) : null)).filter(Boolean) as string[]
    if (at.length > 1) dupE.push(`${edgeName(i)}×${at.length}(在${at.join('、')}两处)`)
    if (at.length === 0) missE.push(edgeName(i))
  }

  if (badC.length || badE.length || dupC.length || missC.length || dupE.length || missE.length) {
    const lines = ['具体原因:以下块组合在真实魔方上不可能同时出现,请对照手上魔方核对这些贴纸:']
    lines.push(...badC, ...badE)
    lines.push(...dupC, ...missC.map(x => `缺失角块:${x}`), ...dupE, ...missE.map(x => `缺失棱块:${x}`))
    return fail(UNSOLVABLE_MESSAGE, lines.join('\n'))
  }

  if (co.reduce((a, b) => a + b, 0) % 3 !== 0)
    return fail(UNSOLVABLE_MESSAGE, '具体原因:有角块被原地扭转(角块朝向之和不是3的倍数)。')
  if (eo.reduce((a, b) => a + b, 0) % 2 !== 0)
    return fail(UNSOLVABLE_MESSAGE, '具体原因:有棱块被原地翻转(棱块朝向之和不是2的倍数)。')
  if (permutationParity(cp) !== permutationParity(ep))
    return fail(UNSOLVABLE_MESSAGE, '具体原因:角块与棱块的置换奇偶性不一致(像只交换了两块)。')
  return { solvable: true }
}
