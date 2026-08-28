import type { Color } from '../types'

const ORDER: Color[] = ['Y','R','B','W','O','G']
const HEX: Record<Color, string> = { W:'#f8f8f8', Y:'#ffd500', R:'#c41e3a', O:'#ff8c00', G:'#009e60', B:'#0051ba' }

export function Palette({ remaining, brush, onPick }: {
  remaining: Record<Color, number>; brush: Color; onPick: (c: Color) => void
}) {
  return (
    <div className="palette">
      {ORDER.map(c => (
        <button key={c} data-color={c}
          className={'chip' + (c === brush ? ' active' : '')}
          style={{ background: HEX[c], color: c === 'W' || c === 'Y' ? '#222' : '#fff' }}
          onClick={() => onPick(c)}>
          {remaining[c]}
        </button>
      ))}
    </div>
  )
}
