import type { CubeState, Face, Orientation } from '../types'
import { visibleFaces } from '../lib/cube'
import { Sticker } from './Sticker'

export function Cube({ cube, orientation, onSticker }: {
  cube: CubeState; orientation: Orientation; onSticker: (face: Face, index: number) => void
}) {
  const v = visibleFaces(orientation)
  const facesToRender: { face: Face; cls: string }[] = [
    { face: v.top, cls: 'face-top' },
    { face: v.left, cls: 'face-left' },
    { face: v.right, cls: 'face-right' },
  ]
  return (
    <div className="scene">
      <div className={`cube ${orientation}`}>
        {facesToRender.map(({ face, cls }) => (
          <div key={cls} className={`face ${cls}`}>
            {cube[face].map((color, index) => (
              <Sticker key={index} color={color} isCenter={index === 4} face={face} index={index}
                onClick={() => onSticker(face, index)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
