import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { solve } from '../lib/solver'
import { applyMoves } from '../lib/moves'
import { Cube } from '../components/Cube'
import { SolveControls } from '../components/SolveControls'

export default function Solve() {
  const { cube, full, validation, orientation } = useApp()
  const solvable = full && validation?.solvable
  const steps = useMemo(() => (solvable ? solve(cube) : []), [cube, solvable])
  const flatMoves = useMemo(() => steps.flatMap(s => s.moves), [steps])
  const [i, setI] = useState(0)            // number of moves applied
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    if (i >= flatMoves.length) { setPlaying(false); return }
    const t = setTimeout(() => setI(n => n + 1), 700)
    return () => clearTimeout(t)
  }, [playing, i, flatMoves.length])

  if (!solvable) return <Navigate to="/" replace />

  const shown = applyMoves(cube, flatMoves.slice(0, i))
  // find which step the current move belongs to for the caption
  let acc = 0, current = steps[0]
  for (const s of steps) { if (i <= acc + s.moves.length) { current = s; break } acc += s.moves.length }

  return (
    <div className="app solve">
      <header className="solve-header">
        <Link to="/" className="back">返回填色</Link>
        <span className="progress">{i}/{flatMoves.length}</span>
      </header>
      <Cube cube={shown} orientation={orientation} onSticker={() => {}} />
      <p className="solve-caption"><b>{current?.stage}</b> — {current?.note}</p>
      <SolveControls index={i} total={flatMoves.length} playing={playing}
        onPrev={() => setI(n => Math.max(0, n - 1))}
        onNext={() => setI(n => Math.min(flatMoves.length, n + 1))}
        onPlay={() => setPlaying(p => !p)} />
    </div>
  )
}
