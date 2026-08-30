export function SolveControls({ index, total, onPrev, onNext, onPlay, playing, stepMs, onStepMs }: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  playing: boolean
  // Task 9 wires these to a speed slider; for now they keep the prop surface
  // stable so Solve.tsx typechecks before the slider exists.
  stepMs: number
  onStepMs: (ms: number) => void
}) {
  // Props accepted but not yet rendered (Task 9 adds the slider + its test).
  void stepMs
  void onStepMs
  const atEnd = index >= total
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0}>上一步</button>
      <button onClick={onPlay}>{playing ? '暂停' : '播放'}</button>
      <button onClick={onNext} disabled={atEnd}>{atEnd ? '完成' : '下一步'}</button>
    </div>
  )
}
