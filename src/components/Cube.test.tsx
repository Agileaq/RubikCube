import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Cube, FACE_ORDER } from './Cube'
import { emptyCube, solvedCube, visibleFaces } from '../lib/cube'
import { applyMoves, parseMoves } from '../lib/moves'
import { validate } from '../lib/solvability'
import type { CubeState, Face } from '../types'

describe('Cube', () => {
  it('renders 27 stickers (3 visible iso faces x 9) and marks orientation', () => {
    const { container } = render(<Cube cube={emptyCube()} orientation="default" onSticker={() => {}} />)
    expect(container.querySelectorAll('[data-sticker]')).toHaveLength(27)
    expect(container.querySelector('.cube')?.className).toContain('default')
  })

  it('clicking a non-center sticker calls onSticker; center does not', () => {
    const onSticker = vi.fn()
    const { container } = render(<Cube cube={emptyCube()} orientation="default" onSticker={onSticker} />)
    const stickers = container.querySelectorAll<HTMLElement>('[data-sticker]')
    // find a center (index 4) and a non-center on the top face
    const top0 = container.querySelector<HTMLElement>('[data-face="U"][data-index="0"]')!
    const topCenter = container.querySelector<HTMLElement>('[data-face="U"][data-index="4"]')!
    top0.click(); topCenter.click()
    expect(onSticker).toHaveBeenCalledTimes(1)
    expect(onSticker).toHaveBeenCalledWith('U', 0)
    expect(stickers.length).toBe(27)
  })

  // Regression guard for the false-"unsolvable" bug. The isometric CSS rotates
  // faces, so the paint UI reorders stickers per face (FACE_ORDER in Cube.tsx).
  // Each visible face must render all 9 facelet indices exactly once — if a
  // SLOT_ORDER permutation ever dropped or duplicated an index, some stickers
  // would be unfillable and the stored cube could never be a valid (solvable)
  // physical cube. This asserts every visible face exposes a full 0..8 set.
  it('each visible face renders all 9 facelet indices exactly once', () => {
    for (const orientation of ['default', 'flipped'] as const) {
      const { container } = render(
        <Cube cube={emptyCube()} orientation={orientation} onSticker={() => {}} />,
      )
      const v = visibleFaces(orientation)
      for (const face of [v.top, v.left, v.right] as Face[]) {
        const indices = Array.from(
          container.querySelectorAll<HTMLElement>(`[data-face="${face}"]`),
          el => Number(el.getAttribute('data-index')),
        ).sort((a, b) => a - b)
        expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
      }
    }
  })

  // A solved cube stays solvable after a paint round-trip through the component
  // (sanity that reading stickers by their own index reconstructs the state).
  it('painting a real scramble through the component preserves solvability', () => {
    const truth = applyMoves(solvedCube(), parseMoves("R U R' U' F2 L D B' R2 U' F B'"))
    const stored: CubeState = emptyCube()
    for (const orientation of ['default', 'flipped'] as const) {
      const { container } = render(
        <Cube cube={truth} orientation={orientation} onSticker={() => {}} />,
      )
      const v = visibleFaces(orientation)
      for (const face of [v.top, v.left, v.right] as Face[]) {
        container.querySelectorAll<HTMLElement>(`[data-face="${face}"]`).forEach(el => {
          const idx = Number(el.getAttribute('data-index'))
          stored[face][idx] = truth[face][idx]
        })
      }
    }
    expect(validate(stored).solvable).toBe(true)
  })

  // Regression for the false-"unsolvable" bug: the flipped-view B face used to
  // store the on-screen top row at facelet row 0 instead of row 6, so a
  // faithfully painted physical D turn exported as unsolvable. Fixture from a
  // real-cube session: solved + D, painted as seen (captured under the OLD
  // order [2,5,8,1,4,7,0,3,6]); re-storing that same view through the current
  // FACE_ORDER must reproduce the move engine's B face exactly.
  it('flipped-view B order reproduces a real D turn (real-cube fixture)', () => {
    const exportedB = 'RRRBBBBBB'.split('')
    const OLD = [2, 5, 8, 1, 4, 7, 0, 3, 6]
    const seen = new Array(9)
    for (let s = 0; s < 9; s++) seen[s] = exportedB[OLD[s]]
    const truth = applyMoves(solvedCube(), parseMoves('D'))
    const stored = new Array(9)
    for (let s = 0; s < 9; s++) stored[FACE_ORDER.B[s]] = seen[s]
    expect(stored).toEqual(truth.B)
  })
})
