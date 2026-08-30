import type { CubeState, Face, Orientation } from '../types'
import { visibleFaces } from '../lib/cube'
import { Sticker } from './Sticker'

/**
 * 2.5-D isometric cube. Three faces render as equal-area isometric
 * parallelograms — no perspective, so every sticker stays a full, tappable
 * quad. `visibleFaces` picks which faces show: default = U/L/F (white/orange/
 * green, req 4); flipped = D/B/R (yellow/blue/red, req 5).
 *
 * The isometric CSS transform rotates each face on screen, so the DOM grid
 * order (0..8) does NOT line up with the validator's face-on facelet index
 * convention — and the rotation differs PER FACE (a face and its opposite,
 * shown through the same on-screen slot, are oriented differently). So the
 * reorder is keyed by FACE, not slot: each face renders cube[face][ORDER[face]
 * [s]] at DOM slot s, so the sticker the user sees at face-on cell s carries
 * facelet index s. Getting this per-face orientation right is what makes a real
 * physical cube store as a solvable state.
 */
export const FACE_ORDER: Record<Face, number[]> = {
  U: [6, 3, 0, 7, 4, 1, 8, 5, 2], // top slot (default)
  L: [2, 5, 8, 1, 4, 7, 0, 3, 6], // left slot (default)
  F: [0, 1, 2, 3, 4, 5, 6, 7, 8], // right slot (default)
  D: [8, 7, 6, 5, 4, 3, 2, 1, 0], // top slot (flipped) — verified against a real cube
  B: [6, 3, 0, 7, 4, 1, 8, 5, 2], // left slot (flipped) — verified against physical D turns:
  // the on-screen top row of the back face is its bottom facelet row (6,7,8)
  R: [8, 7, 6, 5, 4, 3, 2, 1, 0], // right slot (flipped) — verified against a real cube
}

export function Cube({ cube, orientation, onSticker }: {
  cube: CubeState; orientation: Orientation; onSticker: (face: Face, index: number) => void
}) {
  const v = visibleFaces(orientation)
  const slots: { face: Face; cls: string }[] = [
    { face: v.top, cls: 'iso-top' },
    { face: v.left, cls: 'iso-left' },
    { face: v.right, cls: 'iso-right' },
  ]
  return (
    <div className="scene">
      <div className={`cube ${orientation}`}>
        {slots.map(({ face, cls }) => (
          <div key={cls} className={`face ${cls}`}>
            {FACE_ORDER[face].map(index => (
              <Sticker key={index} color={cube[face][index]} isCenter={index === 4}
                face={face} index={index} onClick={() => onSticker(face, index)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

