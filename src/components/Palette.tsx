import type { Color } from '../types'
import { COLOR_ORDER, COLOR_HEX } from '../lib/colors'

export function Palette({ remaining, brush, onPick }: {
  remaining: Record<Color, number>; brush: Color; onPick: (c: Color) => void
}) {
  return (
    <div className="palette">
      {COLOR_ORDER.map(c => (
        <button key={c} data-color={c}
          className={'chip' + (c === brush ? ' active' : '')}
          style={{ background: COLOR_HEX[c], color: c === 'W' || c === 'Y' ? '#222' : '#fff' }}
          onClick={() => onPick(c)}>
          {remaining[c]}
        </button>
      ))}
    </div>
  )
}
