export function FlipButton({ onFlip }: { onFlip: () => void }) {
  return (
    <button className="flip-btn" aria-label="翻转魔方" onClick={onFlip}>
      <span aria-hidden="true">⟲</span>
      <span className="flip-cube" aria-hidden="true">🧊</span>
      <span aria-hidden="true">⟳</span>
    </button>
  )
}
