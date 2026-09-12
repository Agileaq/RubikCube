// Self-contained classic worker wrapping the cubejs Kociemba solver.
// initSolver (~1s desktop, several seconds on phones) and the two-phase
// search run here, off the main thread, so the UI stays responsive and a
// failure here is observable instead of a silent hang. cubejs is bundled
// INTO this worker file, so no dynamic chunk loading can fail at runtime.
import * as cubejsNs from 'cubejs'

// cubejs is CommonJS exporting the Cube class AS the module — under the
// bundler's CJS interop the class lands on .default (or .Cube), never as a
// working named import. Same resolution as the main-thread fallback.
const Cube: typeof cubejsNs.Cube =
  (cubejsNs as any).Cube ?? (cubejsNs as any).default ?? (cubejsNs as any)

let ready = false

interface SolveRequest {
  id: number
  cp: number[]
  co: number[]
  ep: number[]
  eo: number[]
}

self.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { id, cp, co, ep, eo } = e.data
  try {
    if (!ready) {
      Cube.initSolver()
      ready = true
    }
    const c = new Cube()
    c.cp = cp
    c.co = co
    c.ep = ep
    c.eo = eo
    const solution = c.solve()
    ;(self as any).postMessage({ id, moves: solution })
  } catch (err) {
    ;(self as any).postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
