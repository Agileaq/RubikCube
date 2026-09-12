import type { CubeState, Move, SolveStep, Face } from '../types'
import { applyMove, parseMoves } from './moves'
import { solvedCube } from './cube'
import { toCubies } from './cubie'

export const STAGES: string[] = [
  '白色十字', '白色面和侧面T字', '中层棱块',
  '顶层黄色十字', '顶层黄色面', '顶层凹字(角块归位)', '顶层棱块归位',
]

// ---------------------------------------------------------------------------
// Self-contained cubie engine (cp/co/ep/eo). Move tables are derived once from
// the trusted facelet move engine so this file cannot drift from it.
//
// Slot conventions (from cubie.ts):
//   Corners: URF=0 UFL=1 ULB=2 UBR=3 DFR=4 DLF=5 DBL=6 DRB=7
//   Edges:   UR=0 UF=1 UL=2 UB=3 DR=4 DF=5 DL=6 DB=7 FR=8 FL=9 BL=10 BR=11
// White center is U, yellow is D, so the first ("white") layer is U (corners
// 0-3, edges 0-3), the middle layer is edges 8-11, and the last ("yellow")
// layer is D (corners 4-7, edges 4-7).
// ---------------------------------------------------------------------------
interface Cube { cp: number[]; co: number[]; ep: number[]; eo: number[] }

const ALL_FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
const DIRS: (1 | -1 | 2)[] = [1, -1, 2]
const ALL_MOVES: Move[] = ALL_FACES.flatMap(face => DIRS.map(dir => ({ face, dir } as Move)))
const OPPOSITE: Record<Face, Face> = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' }

// Clockwise move tables, derived from applyMove on the solved cube at load.
const CW: Record<Face, Cube> = (() => {
  const s = solvedCube()
  const out = {} as Record<Face, Cube>
  for (const f of ALL_FACES) {
    const q = toCubies(applyMove(s, { face: f, dir: 1 }))
    if (!q) throw new Error('solver: failed to derive move table for ' + f)
    out[f] = { cp: q.cp, co: q.co, ep: q.ep, eo: q.eo }
  }
  return out
})()

const SOLVED: Cube = (() => {
  const q = toCubies(solvedCube())!
  return { cp: q.cp, co: q.co, ep: q.ep, eo: q.eo }
})()

// Full move table for every (face,dir) so a move is a single permutation apply
// (no repeated CW loop, no intermediate allocations on the hot path).
const MOVE_TABLE = new Map<string, Cube>()
{
  const applyCW = (st: Cube, f: Face): Cube => {
    const t = CW[f]
    const cp = new Array<number>(8), co = new Array<number>(8)
    const ep = new Array<number>(12), eo = new Array<number>(12)
    for (let i = 0; i < 8; i++) { cp[i] = st.cp[t.cp[i]]; co[i] = (st.co[t.cp[i]] + t.co[i]) % 3 }
    for (let i = 0; i < 12; i++) { ep[i] = st.ep[t.ep[i]]; eo[i] = (st.eo[t.ep[i]] + t.eo[i]) % 2 }
    return { cp, co, ep, eo }
  }
  for (const face of ALL_FACES) {
    for (const dir of DIRS) {
      const n = dir === 2 ? 2 : dir === -1 ? 3 : 1
      let s = SOLVED
      for (let i = 0; i < n; i++) s = applyCW(s, face)
      MOVE_TABLE.set(face + dir, s)
    }
  }
}

function applyMv(st: Cube, m: Move): Cube {
  const t = MOVE_TABLE.get(m.face + m.dir)!
  const cp = new Array<number>(8), co = new Array<number>(8)
  const ep = new Array<number>(12), eo = new Array<number>(12)
  for (let i = 0; i < 8; i++) { cp[i] = st.cp[t.cp[i]]; co[i] = (st.co[t.cp[i]] + t.co[i]) % 3 }
  for (let i = 0; i < 12; i++) { ep[i] = st.ep[t.ep[i]]; eo[i] = (st.eo[t.ep[i]] + t.eo[i]) % 2 }
  return { cp, co, ep, eo }
}

function applyMvs(st: Cube, ms: Move[]): Cube {
  let s = st
  for (const m of ms) s = applyMv(s, m)
  return s
}

const invMove = (m: Move): Move => ({ face: m.face, dir: (m.dir === 2 ? 2 : -m.dir) as Move['dir'] })

function fromCubeState(c: CubeState): Cube {
  const q = toCubies(c)
  if (!q) throw new Error('solver: input cube is not fully colored / invalid')
  return { cp: q.cp, co: q.co, ep: q.ep, eo: q.eo }
}

const fullKey = (s: Cube): string => s.cp.join(',') + s.co.join('') + s.ep.join(',') + s.eo.join('')

// ---------------------------------------------------------------------------
// Piece-oriented solving via masked bidirectional (meet-in-the-middle) BFS.
//
// For each sub-goal we care only about a subset of pieces (`careEdges` /
// `careCorners`, given as piece indices). A masked key records only the slot
// and orientation of those pieces, treating every other cubie as a wildcard.
// We search forward from the current state and backward from the solved state,
// meeting in the middle on the masked key. The concatenated path then places
// exactly the cared pieces home while leaving the rest free — the essence of
// beginner layer-by-layer insertions, but found by search so it is provably
// correct. Half-depth is small, so this stays fast and memory-light.
// ---------------------------------------------------------------------------
function maskedKey(st: Cube, careEdges: number[], careCorners: number[]): string {
  // For each cared piece record the slot it sits in and its orientation there.
  // Single pass over the arrays (avoids repeated indexOf scans on the hot path).
  let k = ''
  if (careEdges.length) {
    for (let slot = 0; slot < 12; slot++) {
      const p = st.ep[slot]
      if (careEdges.includes(p)) k += p + ':' + slot + '.' + st.eo[slot] + '|'
    }
  }
  k += '#'
  if (careCorners.length) {
    for (let slot = 0; slot < 8; slot++) {
      const p = st.cp[slot]
      if (careCorners.includes(p)) k += p + ':' + slot + '.' + st.co[slot] + '|'
    }
  }
  return k
}

interface BiNode { c: Cube; p: Move[] }

// Every care-set uses a depth-5 backward map. These are built once, eagerly,
// at module load (see the bottom of this file), so each solve does only a
// shallow forward search plus map lookups — keeping per-solve time low and,
// crucially, stable (no mid-solve map builds causing latency spikes).
const BACKWARD_DEPTH = 5

const canExtend = (path: Move[], m: Move): boolean => {
  const last = path[path.length - 1]
  if (last && last.face === m.face) return false
  const last2 = path[path.length - 2]
  // canonical ordering on opposite faces (e.g. never do L after R after L)
  if (last && last2 && last.face === OPPOSITE[m.face] && last2.face === m.face) return false
  return true
}

// Backward maps from SOLVED are identical for a given care-set on every solve,
// so we build each one once and cache it. Maps a masked key to the move path
// that carries SOLVED to that masked configuration (its inverse solves it).
const backwardCache = new Map<string, Map<string, Move[]>>()

// Care-sets involving corners explode combinatorially (branching ≈13.5 per
// depth level over a masked state space of billions), so their backward maps
// are hard-capped one level shallower. Measured on desktop Node: depth 5 built
// ~2.7M entries ≈ 2GB heap and ~6s — iOS Safari jetsammed the tab mid-build,
// crashing the solve page in a reload loop ("A problem repeatedly occurred").
// Depth 4 builds ~330k entries ≈ 180MB in ~1s. Edges-only sets stay at 5:
// their masked space is tiny (≤190k arrangements) so their maps stay small.
// The clamp lives INSIDE backwardMap so the eager prebuild and every
// meetInMiddle query share one code path and can never drift apart.
const CORNER_BACKWARD_DEPTH = 4

function backwardMap(careEdges: number[], careCorners: number[], depth: number): Map<string, Move[]> {
  if (careCorners.length && depth > CORNER_BACKWARD_DEPTH) depth = CORNER_BACKWARD_DEPTH
  const cacheKey = careEdges.join('.') + '#' + careCorners.join('.') + '@' + depth
  const cached = backwardCache.get(cacheKey)
  if (cached) return cached

  const map = new Map<string, Move[]>([[maskedKey(SOLVED, careEdges, careCorners), []]])
  let frontier: BiNode[] = [{ c: SOLVED, p: [] }]
  for (let d = 0; d < depth; d++) {
    const next: BiNode[] = []
    for (const node of frontier) {
      for (const m of ALL_MOVES) {
        if (!canExtend(node.p, m)) continue
        const c = applyMv(node.c, m)
        const k = maskedKey(c, careEdges, careCorners)
        if (map.has(k)) continue
        const path = [...node.p, m]
        map.set(k, path)
        next.push({ c, p: path })
      }
    }
    frontier = next
  }
  backwardCache.set(cacheKey, map)
  return map
}

// Meet-in-the-middle: forward BFS from `start` meets a cached backward BFS from
// SOLVED on the masked key. `fwdHalf` + `bwdHalf` bounds the total solution
// length; the backward half is memoized across solves.
function meetInMiddle(start: Cube, careEdges: number[], careCorners: number[], fwdHalf: number, bwdHalf: number): Move[] | null {
  const startKey = maskedKey(start, careEdges, careCorners)
  const bMap = backwardMap(careEdges, careCorners, bwdHalf)
  const startHit = bMap.get(startKey)
  if (startHit !== undefined) return startHit.slice().reverse().map(invMove)

  const fMap = new Map<string, Move[]>([[startKey, []]])
  let frontier: BiNode[] = [{ c: start, p: [] }]
  for (let d = 0; d < fwdHalf; d++) {
    const next: BiNode[] = []
    for (const node of frontier) {
      for (const m of ALL_MOVES) {
        if (!canExtend(node.p, m)) continue
        const c = applyMv(node.c, m)
        const k = maskedKey(c, careEdges, careCorners)
        if (fMap.has(k)) continue
        const path = [...node.p, m]
        const hit = bMap.get(k)
        if (hit !== undefined) return [...path, ...hit.slice().reverse().map(invMove)]
        fMap.set(k, path)
        next.push({ c, p: path })
      }
    }
    frontier = next
  }
  return null
}

// ---------------------------------------------------------------------------
// Last-layer (D) algorithm tokens. Each token preserves the top two layers
// (F2L) while permuting/orienting the D layer. They are the standard beginner
// U-layer algorithms reflected through the horizontal mid-plane (U<->D,
// direction inverted), which keeps them F2L-safe. Together they generate the
// entire 62208-state last-layer group, so token-BFS on them always finds a
// solution for any real post-F2L state.
// ---------------------------------------------------------------------------
function reflectUD(ms: Move[]): Move[] {
  return ms.map(m => ({
    face: m.face === 'U' ? 'D' : m.face === 'D' ? 'U' : m.face,
    dir: (m.dir === 2 ? 2 : -m.dir) as Move['dir'],
  }))
}

const LL_TOKENS: Move[][] = [
  [{ face: 'D', dir: 1 }], [{ face: 'D', dir: -1 }], [{ face: 'D', dir: 2 }],
  reflectUD(parseMoves("F R U R' U' F'")),                       // edge orientation
  reflectUD(parseMoves("R U R' U R U2 R'")),                     // sune
  reflectUD(parseMoves("R U2 R' U' R U' R'")),                   // anti-sune
  reflectUD(parseMoves("R U R' U' R' F R2 U' R' U' R U R' F'")), // T-perm
  reflectUD(parseMoves("R' F R' B2 R F' R' B2 R2")),             // A-perm (corner 3-cycle)
  reflectUD(parseMoves("R2 U R U R' U' R' U' R' U R'")),         // U-perm (edge 3-cycle)
  // Extra LL generators, filtered for F2L-safety at module load (see
  // LL_TOKENS_SAFE): alternative EO, lefty sune, U-perm mirror, extra A-perm,
  // H-perm, Z-perm, J/T-flavored PLLs. A mis-remembered candidate is simply
  // dropped by the filter, so listing generous candidates is free. Together
  // the surviving tokens cut last-layer paths (~5 moves avg per solve).
  reflectUD(parseMoves("F U R U' R' F'")),
  reflectUD(parseMoves("L' U' L U' L' U2 L")),
  reflectUD(parseMoves("R2 U' R' U' R U R U R U' R")),
  reflectUD(parseMoves("R2 B2 R F2 R' B2 R F2 R")),
  reflectUD(parseMoves("R2 U2 R U2 R2 U2 R2 U2 R U2 R2")),
  reflectUD(parseMoves("R U R' U R' U' R' U R U' R' U' R2 U R")),
  reflectUD(parseMoves("R U R' F' R U R' U' R' F R2 U' R'")),
  reflectUD(parseMoves("R U' R' U' R U R D R' U' R D' R' U2 R'")),
  reflectUD(parseMoves("R U R' U' R' F R2 U' R' U' R U R' F'")),
  reflectUD(parseMoves("R' U R' U2 R U' R' U2 R2 D U' R2 U R2 D'")),
  reflectUD(parseMoves("R2 U' R' U2 R U R' U2 R' D R' U R D'")),
  reflectUD(parseMoves("R U R' U' D R U' R' U D' R U' R' U2 R U R'")),
]

function tokenBfs(start: Cube, goal: (c: Cube) => boolean, maxTokens: number): Move[] | null {
  if (goal(start)) return []
  interface Node { c: Cube; path: Move[][] }
  let frontier: Node[] = [{ c: start, path: [] }]
  const seen = new Set<string>([fullKey(start)])
  for (let depth = 0; depth < maxTokens; depth++) {
    const next: Node[] = []
    for (const node of frontier) {
      for (const tk of LL_TOKENS_SAFE) {
        const c = applyMvs(node.c, tk)
        const k = fullKey(c)
        if (seen.has(k)) continue
        seen.add(k)
        const path = [...node.path, tk]
        if (goal(c)) return path.flat()
        next.push({ c, path })
      }
    }
    frontier = next
  }
  return null
}

// ---------------------------------------------------------------------------
// Goal helpers
// ---------------------------------------------------------------------------
const edgesHome = (c: Cube, slots: number[]) => slots.every(s => c.ep[s] === s && c.eo[s] === 0)
const cornersHome = (c: Cube, slots: number[]) => slots.every(s => c.cp[s] === s && c.co[s] === 0)

// A token that fixes the F2L slots pointwise with zero orientation delta on
// SOLVED does so for EVERY state (its move table maps those slots to
// themselves orientation-free), i.e. it is a genuine last-layer generator.
// Filtering at module load keeps tokenBfs's move set exactly the valid ones.
const F2L_SOLVED = (s: Cube) => edgesHome(s, [0, 1, 2, 3, 8, 9, 10, 11]) && cornersHome(s, [0, 1, 2, 3])
const LL_TOKENS_SAFE = LL_TOKENS.filter(tk => F2L_SOLVED(applyMvs(SOLVED, tk)))

// ---------------------------------------------------------------------------
// Solve
// ---------------------------------------------------------------------------
export function solve(input: CubeState): SolveStep[] {
  const steps: SolveStep[] = []
  let c = fromCubeState(input)

  const emit = (stage: string, note: string, mv: Move[]) => {
    if (mv.length === 0) return
    c = applyMvs(c, mv)
    steps.push({ stage, moves: mv, note })
  }

  // A masked-MITM sub-goal that places the given cared pieces home.
  //
  // Backward maps are memoized per care-set (≈12 total across all solves) and
  // reused on every subsequent solve. A deeper backward half shrinks the
  // forward search dramatically but costs more to build; corner-involving
  // care-sets explode combinatorially, so backwardMap clamps those to
  // CORNER_BACKWARD_DEPTH (4) and a slightly deeper forward search covers the
  // difference.
  const place = (stage: string, note: string, careEdges: number[], careCorners: number[]) => {
    let mv = meetInMiddle(c, careEdges, careCorners, 4, BACKWARD_DEPTH)
    if (mv === null) mv = meetInMiddle(c, careEdges, careCorners, 9, BACKWARD_DEPTH)
    if (mv === null) throw new Error('solver: meet-in-the-middle failed (unsolvable input?)')
    emit(stage, note, mv)
  }

  // A last-layer token sub-goal.
  const finish = (stage: string, note: string, goal: (c: Cube) => boolean) => {
    const mv = tokenBfs(c, goal, 9)
    if (mv === null) throw new Error('solver: last-layer search failed (unsolvable input?)')
    emit(stage, note, mv)
  }

  // ---- Stage 1: white cross (U edges 0,1,2,3), one edge at a time ------------
  {
    const done: number[] = []
    for (const slot of [0, 1, 2, 3]) {
      done.push(slot)
      place(STAGES[0], '把白色棱块对齐中心，做出白色十字', [...done], [])
    }
  }

  // ---- Stage 2: white corners (U corners 0,1,2,3), keeping the cross ---------
  {
    const done: number[] = []
    for (const slot of [0, 1, 2, 3]) {
      done.push(slot)
      place(STAGES[1], '把白色角块归位，完成白色面和四个侧面T字', [0, 1, 2, 3], [...done])
    }
  }

  // ---- Stage 3: middle-layer edges (slots 8,9,10,11), keeping first layer ----
  {
    const done: number[] = [0, 1, 2, 3]
    for (const slot of [8, 9, 10, 11]) {
      done.push(slot)
      place(STAGES[2], '把中层四个棱块归位', [...done], [0, 1, 2, 3])
    }
  }

  // At this point the top two layers are solved; only the D layer remains.
  const F2L = (s: Cube) => edgesHome(s, [0, 1, 2, 3, 8, 9, 10, 11]) && cornersHome(s, [0, 1, 2, 3])

  // ---- Stage 4: yellow (D) cross — orient last-layer edges -------------------
  finish(STAGES[3], '做出顶层黄色十字',
    s => F2L(s) && [4, 5, 6, 7].every(e => s.eo[e] === 0))

  // ---- Stage 5: yellow (D) face — orient last-layer corners ------------------
  finish(STAGES[4], '翻转顶层角块，完成黄色面',
    s => F2L(s) && [4, 5, 6, 7].every(e => s.eo[e] === 0) && [4, 5, 6, 7].every(k => s.co[k] === 0))

  // ---- Stage 6: permute last-layer corners -----------------------------------
  finish(STAGES[5], '调整顶层角块位置(凹字)',
    s => F2L(s) && [4, 5, 6, 7].every(e => s.eo[e] === 0) && cornersHome(s, [4, 5, 6, 7]))

  // ---- Stage 7: permute last-layer edges — full solve ------------------------
  finish(STAGES[6], '调整顶层棱块位置，完成复原',
    s => fullKey(s) === fullKey(SOLVED))

  return compactSteps(steps)
}

// The fixed set of care-sets the solver uses, in the order `place` requests
// them. Their backward maps are built once, eagerly, at module load, so that
// no individual solve pays the build cost and per-solve time stays low and
// stable. (The build touches only ~12 fixed care-sets and is shared by every
// subsequent solve() call.) backwardMap clamps corner-involving sets to
// CORNER_BACKWARD_DEPTH, keeping the prebuild inside the mobile memory budget.
const CARE_SETS: { careEdges: number[]; careCorners: number[] }[] = [
  { careEdges: [0], careCorners: [] },
  { careEdges: [0, 1], careCorners: [] },
  { careEdges: [0, 1, 2], careCorners: [] },
  { careEdges: [0, 1, 2, 3], careCorners: [] },
  { careEdges: [0, 1, 2, 3], careCorners: [0] },
  { careEdges: [0, 1, 2, 3], careCorners: [0, 1] },
  { careEdges: [0, 1, 2, 3], careCorners: [0, 1, 2] },
  { careEdges: [0, 1, 2, 3], careCorners: [0, 1, 2, 3] },
  { careEdges: [0, 1, 2, 3, 8], careCorners: [0, 1, 2, 3] },
  { careEdges: [0, 1, 2, 3, 8, 9], careCorners: [0, 1, 2, 3] },
  { careEdges: [0, 1, 2, 3, 8, 9, 10], careCorners: [0, 1, 2, 3] },
  { careEdges: [0, 1, 2, 3, 8, 9, 10, 11], careCorners: [0, 1, 2, 3] },
]
for (const { careEdges, careCorners } of CARE_SETS) backwardMap(careEdges, careCorners, BACKWARD_DEPTH)

// Test/diagnostics accessor: how many backward maps are prebuilt and how many
// masked-key entries they hold in total. The mobile memory budget regression
// test asserts this stays small (see solver.test.ts).
export function backwardMapStats(): { maps: number; entries: number } {
  let entries = 0
  for (const m of backwardCache.values()) entries += m.size
  return { maps: backwardCache.size, entries }
}

// ---------------------------------------------------------------------------
// Move compaction: merge/cancel adjacent same-face turns.
//
// Search paths can't contain adjacent same-face turns (canExtend prunes them),
// but the JOIN of two sub-goal paths or two token algorithms can ("...R" +
// "R U..." → R2; "...R" + "R'..." → nothing). Merging them shortens playback
// with zero effect on the net transform. A merged move is tagged to the newer
// step so the solve page's caption keeps naming the stage the upcoming move
// works toward; steps left without moves drop out entirely.
// ---------------------------------------------------------------------------
const quartersOf = (dir: Move['dir']) => (dir === -1 ? 3 : dir)

export function compactSteps(steps: SolveStep[]): SolveStep[] {
  const out: { m: Move; s: number }[] = []
  steps.forEach((st, si) => {
    for (const m of st.moves) {
      const top = out[out.length - 1]
      if (top && top.m.face === m.face) {
        const q = (quartersOf(top.m.dir) + quartersOf(m.dir)) % 4
        out.pop()
        if (q !== 0) out.push({ m: { face: m.face, dir: q === 3 ? -1 : q } as Move, s: si })
      } else {
        out.push({ m, s: si })
      }
    }
  })
  const compact: SolveStep[] = []
  let last = -1
  for (const { m, s } of out) {
    if (s !== last) { compact.push({ ...steps[s], moves: [m] }); last = s } else compact[compact.length - 1].moves.push(m)
  }
  return compact
}
