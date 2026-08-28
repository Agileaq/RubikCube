import type { Color } from '../types'

const HEX: Record<Color, string> = { W: '#f8f8f8', Y: '#ffd500', R: '#c41e3a', O: '#ff8c00', G: '#009e60', B: '#0051ba' }

export function Sticker({ color, onClick, isCenter, face, index }: {
  color: Color | null; onClick: () => void; isCenter: boolean; face: string; index: number
}) {
  return (
    <div
      data-sticker data-face={face} data-index={index}
      className={'sticker' + (isCenter ? ' center' : '') + (color ? '' : ' empty')}
      style={{ background: color ? HEX[color] : 'rgba(255,255,255,0.25)' }}
      onClick={() => { if (!isCenter) onClick() }}
    />
  )
}
