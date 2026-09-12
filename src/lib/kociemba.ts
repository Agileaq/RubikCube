import type { CubeState, Move } from '../types'
import { toCubies } from './cubie'
import { parseMoves } from './moves'

// Kociemba two-phase solver via the battle-tested `cubejs` library (~20-move
// solutions). The heavy part — one-time table build (~1s desktop, several
// seconds on phones) plus the search — runs inside a self-contained classic
// Web Worker (fastSolver.worker.ts) so the main thread never freezes and a
// failure surfaces as an error instead of an eternal "准备中". Requests carry
// a timeout; worker load failures fall back to solving on the main thread.
//
// We skip cubejs's facelet-string interface entirely: its cubie conventions
// (corner slots URF..DRB, edge slots UR..BR, co mod 3 / eo mod 2, and the
// move composition newCp[to] = cp[other.cp[to]]) are IDENTICAL to our
// cubie.ts, so the tested toCubies output goes straight onto a solved Cube.
// The round-trip tests in kociemba.test.ts are the contract for that.

type CubeClass = typeof import('cubejs').Cube

// ---------------------------------------------------------------------------
// Main-thread fallback — used only where Worker is unavailable (jsdom tests).
// ---------------------------------------------------------------------------
async function loadCube(): Promise<CubeClass> {
  // cubejs is CommonJS exporting the Cube class AS the module, so the class
  // can land on .default or .Cube depending on the bundler's interop.
  const mod: any = await import('cubejs')
  const Cube: CubeClass = mod.Cube ?? mod.default ?? mod
  if (!Cube?.initSolver) throw new Error('kociemba: failed to load cubejs module')
  return Cube
}

let mainThreadInit: Promise<CubeClass> | null = null
function ensureSolverMain(): Promise<CubeClass> {
  if (!mainThreadInit) {
    mainThreadInit = loadCube().then(Cube => {
      Cube.initSolver()
      return Cube
    })
  }
  return mainThreadInit
}

function solveOnMainThread(q: { cp: number[]; co: number[]; ep: number[]; eo: number[] }): Promise<string> {
  return ensureSolverMain().then(Cube => {
    const c = new Cube()
    c.cp = q.cp.slice()
    c.co = q.co.slice()
    c.ep = q.ep.slice()
    c.eo = q.eo.slice()
    return c.solve()
  })
}

// ---------------------------------------------------------------------------
// Worker path
// ---------------------------------------------------------------------------
interface PendingReq {
  resolve: (solution: string) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

// Generous: initSolver measured at ~1s desktop but phones can be 10-20x
// slower; this guards against a lost/hung worker, not slow phones.
const REQUEST_TIMEOUT_MS = 120_000

let worker: Worker | null = null
let workerBroken = false
let nextReqId = 1
const pending = new Map<number, PendingReq>()

function dropWorker() {
  pending.forEach(p => { clearTimeout(p.timer) })
  pending.clear()
  worker?.terminate()
  worker = null
}

function ensureWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      worker = new Worker(new URL('./fastSolver.worker.ts', import.meta.url))
      worker.onmessage = (e: MessageEvent<{ id: number; moves?: string; error?: string }>) => {
        const req = pending.get(e.data.id)
        if (!req) return
        clearTimeout(req.timer)
        pending.delete(e.data.id)
        if (e.data.error !== undefined) req.reject(new Error('kociemba worker: ' + e.data.error))
        else req.resolve(e.data.moves ?? '')
      }
      worker.onerror = () => {
        dropWorker()
        workerBroken = true // worker asset unusable here — solve on main thread
      }
    } catch {
      workerBroken = true
      return null
    }
  }
  return worker
}

function solveOnWorker(w: Worker, q: { cp: number[]; co: number[]; ep: number[]; eo: number[] }): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = nextReqId++
    const timer = setTimeout(() => {
      pending.delete(id)
      dropWorker() // a hung worker is replaced on the next attempt
      reject(new Error('kociemba worker timeout'))
    }, REQUEST_TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    w.postMessage({ id, cp: q.cp, co: q.co, ep: q.ep, eo: q.eo })
  })
}

// ---------------------------------------------------------------------------
export async function solveFast(cube: CubeState): Promise<Move[]> {
  const q = toCubies(cube)
  if (!q) throw new Error('kociemba: input cube is not fully colored / invalid')
  // cubejs returns a redundant 14-move identity algorithm for the solved
  // state — short-circuit it.
  const solvedCubies = q.cp.every((p, i) => p === i && q.co[i] === 0) && q.ep.every((p, i) => p === i && q.eo[i] === 0)
  if (solvedCubies) return []

  const w = ensureWorker()
  const solution = w ? await solveOnWorker(w, q) : await solveOnMainThread(q)
  return parseMoves(solution)
}
