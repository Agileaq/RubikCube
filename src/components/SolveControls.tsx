export function SolveControls({ index, total, onPrev, onNext, onPlay, playing }: {
  index: number; total: number; onPrev: () => void; onNext: () => void; onPlay: () => void; playing: boolean
}) {
  const atEnd = index >= total
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0}>上一步</button>
      <button onClick={onPlay}>{playing ? '暂停' : '播放'}</button>
      <button onClick={onNext} disabled={atEnd}>{atEnd ? '完成' : '下一步'}</button>
    </div>
  )
}
