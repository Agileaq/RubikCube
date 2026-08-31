import { useI18n } from '../i18n'

export function SolveControls({ index, total, onPrev, onNext, onPlay, playing, busy, stepMs, onStepMs }: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  playing: boolean
  busy: boolean
  stepMs: number
  onStepMs: (ms: number) => void
}) {
  const { t } = useI18n()
  const atEnd = index >= total
  const speedLabel = t.solve.speed.replace('{s}', (stepMs / 1000).toFixed(1))
  // While a layer-turn animation is in flight (`busy`), disable prev/next so
  // rapid taps can't queue overlapping animations and desync the demo. The
  // play/pause button stays enabled so the user can still pause mid-turn.
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0 || busy}>{t.solve.prevMove}</button>
      <button onClick={onNext} disabled={atEnd || busy}>{atEnd ? t.solve.finish : t.solve.next}</button>
      <button onClick={onPlay}>{playing ? t.solve.pause : t.solve.play}</button>
      <label className="speed">
        {speedLabel}
        <input type="range" min={1} max={5} step={0.5} value={stepMs / 1000}
          onChange={e => onStepMs(Number(e.target.value) * 1000)} />
      </label>
    </div>
  )
}
