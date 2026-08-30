export function FlipButton({ onFlip }: { onFlip: () => void }) {
  return (
    <button className="flip-btn" aria-label="翻转魔方" onClick={onFlip}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <g fill="currentColor">
          <path d="M100 64 L124 72.5 L100 81 V78
                   C80 79 62 86 57 97
                   C54 106 58 115 64 122
                   C52 112 49.5 106 49.5 99
                   C49.5 82 70 69 100 68.5 Z" />
          <path d="M100 64 L124 72.5 L100 81 V78
                   C80 79 62 86 57 97
                   C54 106 58 115 64 122
                   C52 112 49.5 106 49.5 99
                   C49.5 82 70 69 100 68.5 Z"
                transform="rotate(180 100 100)" />
        </g>
      </svg>
    </button>
  )
}
