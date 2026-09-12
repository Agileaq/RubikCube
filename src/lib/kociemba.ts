import type { CubeState, Move } from '../types'
import { toCubies } from './cubie'
import { parseMoves } from './moves'

// Kociemba two-phase solver via the battle-tested `cubejs` library (~20-move
// solutions). The library is dynamically imported so its chunk — and the
// ~1-3s one-time table build inside initSolver() — is only ever paid on the
// fast-solve route, never on the paint/teaching paths.
//
// We skip cubejs's facelet-string interface entirely: its cubie conventions
// (corner slots URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB; edge slots UR,UF,UL,UB,DR,
// DF,DL,DB,FR,FL,BL,BR; co mod 3, eo mod 2; and the move composition
// newCp[to] = cp[other.cp[to]]) are IDENTICAL to our cubie.ts, so the tested
// toCubies output is assigned straight onto a solved Cube. The round-trip
// tests in kociemba.test.ts are the contract that this equivalence holds.

// cubejs is CommonJS exporting the Cube class AS the module, so the class can
// land on .default or .Cube depending on the bundler's interop — take whichever
// is there (vitest: .default; vite build: .default as well after interop).
type CubeClass = typeof import('cubejs').Cube
async function loadCube(): Promise<CubeClass> {
  const mod: any = await import('cubejs')
  const Cube: CubeClass = mod.Cube ?? mod.default ?? mod
  if (!Cube?.initSolver) throw new Error('kociemba: failed to load cubejs module')
  return Cube
}

let initPromise: Promise<CubeClass> | null = null

function ensureSolver(): Promise<CubeClass> {
  if (!initPromise) {
    initPromise = loadCube().then(Cube => {
      Cube.initSolver()
      return Cube
    })
  }
  return initPromise
}

export async function solveFast(cube: CubeState): Promise<Move[]> {
  const q = toCubies(cube)
  if (!q) throw new Error('kociemba: input cube is not fully colored / invalid')
  // cubejs returns a redundant 14-move identity algorithm for the solved
  // state — short-circuit it.
  const solvedCubies = q.cp.every((p, i) => p === i && q.co[i] === 0) && q.ep.every((p, i) => p === i && q.eo[i] === 0)
  if (solvedCubies) return []
  const Cube = await ensureSolver()
  const c = new Cube()
  c.cp = q.cp.slice()
  c.co = q.co.slice()
  c.ep = q.ep.slice()
  c.eo = q.eo.slice()
  const solution = c.solve()
  return parseMoves(solution)
}
