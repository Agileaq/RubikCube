import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { solve } from '../lib/solver'
import { applyMoves } from '../lib/moves'
import { Cube3D } from '../components/Cube3D'
import { SolveControls } from '../components/SolveControls'
import type { Move } from '../types'

// UI strings (centralized for later i18n — sub-project D).
const TXT = {
  back: '返回填色',
  done: '已复原 ✓',
  nextLabel: '下一步转动',
  prevLabel: '上一步',
}

function formatMove(m: Move): string {
  return m.face + (m.dir === -1 ? "'" : m.dir === 2 ? '2' : '')
}

export default function Solve() {
  const { cube, full, validation } = useApp()
  const solvable = full && validation?.solvable
  const steps = useMemo(() => (solvable ? solve(cube) : []), [cube, solvable])
  const flatMoves = useMemo(() => steps.flatMap(s => s.moves), [steps])
  const [i, setI] = useState(0)                    // number of committed moves
  const [playing, setPlaying] = useState(false)
  const [snapKey, setSnapKey] = useState(0)         // bump to remount Cube3D (snap, no anim)
  const [stepMs, setStepMs] = useState(2000)
  const [animate, setAnimate] = useState(true)     // false → pendingMove forced null (snap mode)
  const [playNonce, setPlayNonce] = useState(0)    // bump to (re)trigger one animation

  const baseCube = useMemo(() => applyMoves(cube, flatMoves.slice(0, i)), [cube, flatMoves, i])
  const done = i >= flatMoves.length

  // Cube3D animates the pending move then calls onAnimDone. We ALWAYS commit
  // (advance i) so baseCube reflects the post-turn state; we only retrigger the
  // next animation when auto-playing, so a single manual next animates one move
  // and pauses. `playing` is read from the render closure — onAnimDone is
  // rebuilt every render and Cube3D invokes the latest prop, so it is current.
  const onAnimDone = () => {
    setI(n => Math.min(flatMoves.length, n + 1))
    if (playing) setPlayNonce(p => p + 1)
  }

  useEffect(() => {
    if (!playing) return
    if (done) setPlaying(false)
  }, [playing, done])

  if (!solvable) return <Navigate to="/" replace />

  const pendingMove = animate && i < flatMoves.length ? flatMoves[i] : null

  // find which step the current move belongs to for the caption
  let acc = 0, current = steps[0]
  for (const s of steps) { if (i <= acc + s.moves.length) { current = s; break } acc += s.moves.length }

  return (
    <div className="app solve">
      <header className="solve-header">
        <Link to="/" className="back">{TXT.back}</Link>
        <span className="progress">{i}/{flatMoves.length}</span>
      </header>
      <Cube3D
        key={snapKey}
        cube={baseCube}
        pendingMove={pendingMove}
        stepMs={stepMs}
        moveNonce={playNonce}
        onAnimDone={onAnimDone}
      />
      <div className="current-move" aria-live="polite">
        {done
          ? <span className="move-done">{TXT.done}</span>
          : <><span className="move-label">{TXT.nextLabel}</span><span className="move-notation">{formatMove(flatMoves[i])}</span></>}
        {!done && i > 0 && <span className="move-prev">{TXT.prevLabel} {formatMove(flatMoves[i - 1])}</span>}
      </div>
      <p className="solve-caption"><b>{current?.stage}</b> — {current?.note}</p>
      <SolveControls
        index={i} total={flatMoves.length} playing={playing}
        stepMs={stepMs} onStepMs={setStepMs}
        onPrev={() => { setAnimate(false); setSnapKey(k => k + 1); setI(n => Math.max(0, n - 1)) }}
        onNext={() => { setAnimate(true); setPlaying(false); setPlayNonce(p => p + 1) }}
        onPlay={() => {
          if (playing) {
            setPlaying(false)
          } else {
            setPlaying(true)
            setAnimate(true)
            setPlayNonce(p => p + 1)
          }
        }}
      />
    </div>
  )
}
