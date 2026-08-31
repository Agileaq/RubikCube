import { useI18n } from '../i18n'

export function SolveControls({ index, total, onPrev, onNext, onPlay, playing, stepMs, onStepMs }: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  playing: boolean
  stepMs: number
  onStepMs: (ms: number) => void
}) {
  const { t } = useI18n()
  const atEnd = index >= total
  const speedLabel = t.solve.speed.replace('{s}', (stepMs / 1000).toFixed(1))
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0}>{t.solve.prevMove}</button>
      <button onClick={onPlay}>{playing ? t.solve.pause : t.solve.play}</button>
      <button onClick={onNext} disabled={atEnd}>{atEnd ? t.solve.finish : t.solve.next}</button>
      <label className="speed">
        {speedLabel}
        <input type="range" min={1} max={5} step={0.5} value={stepMs / 1000}
          onChange={e => onStepMs(Number(e.target.value) * 1000)} />
      </label>
    </div>
  )
}
