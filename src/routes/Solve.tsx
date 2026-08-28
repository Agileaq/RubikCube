import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { solve } from '../lib/solver'
import { applyMoves } from '../lib/moves'
import { Cube } from '../components/Cube'
import { SolveControls } from '../components/SolveControls'
import type { Move } from '../types'

function formatMove(m: Move): string {
  return m.face + (m.dir === -1 ? "'" : m.dir === 2 ? '2' : '')
}

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

  const nextMove = flatMoves[i]           // move about to be applied
  const prevMove = flatMoves[i - 1]       // move just applied
  const done = i >= flatMoves.length

  return (
    <div className="app solve">
      <header className="solve-header">
        <Link to="/" className="back">返回填色</Link>
        <span className="progress">{i}/{flatMoves.length}</span>
      </header>
      <Cube cube={shown} orientation={orientation} onSticker={() => {}} />
      <div className="current-move" aria-live="polite">
        {done
          ? <span className="move-done">已复原 ✓</span>
          : <><span className="move-label">下一步转动</span><span className="move-notation">{formatMove(nextMove)}</span></>}
        {prevMove && !done && <span className="move-prev">上一步 {formatMove(prevMove)}</span>}
      </div>
      <p className="solve-caption"><b>{current?.stage}</b> — {current?.note}</p>
      <SolveControls index={i} total={flatMoves.length} playing={playing}
        onPrev={() => setI(n => Math.max(0, n - 1))}
        onNext={() => setI(n => Math.min(flatMoves.length, n + 1))}
        onPlay={() => setPlaying(p => !p)} />
    </div>
  )
}
