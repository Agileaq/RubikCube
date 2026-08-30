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
  const atEnd = index >= total
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0}>上一步</button>
      <button onClick={onPlay}>{playing ? '暂停' : '播放'}</button>
      <button onClick={onNext} disabled={atEnd}>{atEnd ? '完成' : '下一步'}</button>
      <label className="speed">
        速度: {(stepMs / 1000).toFixed(1)}秒/步
        <input type="range" min={1} max={5} step={0.5} value={stepMs / 1000}
          onChange={e => onStepMs(Number(e.target.value) * 1000)} />
      </label>
    </div>
  )
}
