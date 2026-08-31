import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { useI18n } from '../i18n'
import { solve } from '../lib/solver'
import { applyMoves } from '../lib/moves'
import { Cube3D } from '../components/Cube3D'
import { SolveControls } from '../components/SolveControls'
import type { Move } from '../types'

function formatMove(m: Move): string {
  return m.face + (m.dir === -1 ? "'" : m.dir === 2 ? '2' : '')
}

export default function Solve() {
  const { cube, full, validation } = useApp()
  const { t } = useI18n()
  const solvable = full && validation?.solvable
  const steps = useMemo(() => (solvable ? solve(cube) : []), [cube, solvable])
  const flatMoves = useMemo(() => steps.flatMap(s => s.moves), [steps])
  const [i, setI] = useState(0)                    // number of committed moves
  const [playing, setPlaying] = useState(false)
  const [stepMs, setStepMs] = useState(2500)
  // animate starts false: entering the solve route must NOT auto-advance a
  // step. pendingMove = animate && i<len ? flatMoves[i] : null, so with animate
  // false the first move stays null until the user clicks 播放 or 下一步 (which
  // set animate true + bump playNonce). Previously this defaulted to true, and
  // since moveNonce starts at 0 the Cube3D effect saw a non-null pendingMove on
  // mount and animated one step immediately — the "开始复原后自动走了一步" bug.
  const [animate, setAnimate] = useState(false)    // false → pendingMove forced null (snap mode)
  const [playNonce, setPlayNonce] = useState(0)    // bump to (re)trigger one animation
  // busy = a layer-turn animation is in flight. While busy the prev/next/play
  // buttons are disabled so rapid taps can't queue overlapping animations
  // (which would desync the overlay swap and corrupt the demo). Set true when a
  // tap triggers an animation, cleared in onAnimDone when Cube3D finishes the
  // turn. Prev is also disabled while busy because it mutates `i` mid-flight.
  const [busy, setBusy] = useState(false)

  const baseCube = useMemo(() => applyMoves(cube, flatMoves.slice(0, i)), [cube, flatMoves, i])
  const done = i >= flatMoves.length

  // Cube3D animates the pending move then calls onAnimDone. We ALWAYS commit
  // (advance i) so baseCube reflects the post-turn state; we only retrigger the
  // next animation when auto-playing, so a single manual next animates one move
  // and pauses. `playing` is read from the render closure — onAnimDone is
  // rebuilt every render and Cube3D invokes the latest prop, so it is current.
  // Clear `busy` when the animation lands; if auto-playing and more moves
  // remain, keep busy true so the controls stay disabled through the next turn.
  const onAnimDone = () => {
    const nextI = Math.min(flatMoves.length, i + 1)
    setI(nextI)
    const more = playing && nextI < flatMoves.length
    setBusy(more)
    if (playing && more) setPlayNonce(p => p + 1)
  }

  useEffect(() => {
    if (!playing) return
    if (done) setPlaying(false)
  }, [playing, done])

  if (!solvable) return <Navigate to="/" replace />

  const pendingMove = animate && i < flatMoves.length ? flatMoves[i] : null

  // find which step the current move belongs to for the caption
  let acc = 0, currentIdx = 0
  for (let s = 0; s < steps.length; s++) { if (i <= acc + steps[s].moves.length) { currentIdx = s; break } acc += steps[s].moves.length }

  return (
    <div className="app solve">
      <header className="solve-header">
        <Link to="/" className="back">{t.solve.back}</Link>
        <span className="progress">{i}/{flatMoves.length}</span>
      </header>
      <Cube3D
        cube={baseCube}
        pendingMove={pendingMove}
        stepMs={stepMs}
        moveNonce={playNonce}
        onAnimDone={onAnimDone}
      />
      <div className="current-move" aria-live="polite">
        {done
          ? <span className="move-done">{t.solve.done}</span>
          : <><span className="move-label">{t.solve.nextMove}</span><span className="move-notation">{formatMove(flatMoves[i])}</span></>}
        {!done && i > 0 && <span className="move-prev">{t.solve.prevMove} {formatMove(flatMoves[i - 1])}</span>}
      </div>
      <p className="solve-caption"><b>{t.solve.stages[currentIdx]}</b> — {t.solve.notes[currentIdx]}</p>
      <SolveControls
        index={i} total={flatMoves.length} playing={playing} busy={busy}
        stepMs={stepMs} onStepMs={setStepMs}
        onPrev={() => { if (busy) return; setAnimate(false); setI(n => Math.max(0, n - 1)) }}
        onNext={() => { if (busy) return; setAnimate(true); setPlaying(false); setBusy(true); setPlayNonce(p => p + 1) }}
        onPlay={() => {
          if (busy && !playing) return  // don't start a new turn mid-animation
          if (playing) {
            setPlaying(false)
            setBusy(false)
          } else {
            setPlaying(true)
            setAnimate(true)
            setBusy(true)
            setPlayNonce(p => p + 1)
          }
        }}
      />
    </div>
  )
}
