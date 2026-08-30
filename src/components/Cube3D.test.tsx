import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

// Mock @react-three/fiber Canvas + useFrame so we never touch WebGL/rAF in jsdom.
// useFrame is a no-op: animation timing lives in the pure helpers (animationProgress/isDone).
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) =>
    <div data-testid="canvas">{children}</div>,
  useFrame: vi.fn(),
}))

import { Cube3D, cubieMeshData, animationProgress, isDone } from './Cube3D'
import { solvedCube } from '../lib/cube'

describe('Cube3D', () => {
  it('cubieMeshData returns 27 entries with positions and 6 face colors', () => {
    const data = cubieMeshData(solvedCube())
    expect(data).toHaveLength(27)
    expect(data[0].faceColors).toHaveLength(6)
  })

  it('Cube3D does not throw and renders a Canvas shell', () => {
    const { container } = render(
      <Cube3D cube={solvedCube()} pendingMove={null} stepMs={2000} moveNonce={0} />,
    )
    expect(container.querySelector('[data-testid="canvas"]')).toBeTruthy()
  })

  it('animationProgress clamps to [0,1] and eases (0→0, 1000/2000→0.5, 3000/2000→1)', () => {
    expect(animationProgress(0, 2000)).toBe(0)
    expect(animationProgress(1000, 2000)).toBeCloseTo(0.5)
    expect(animationProgress(3000, 2000)).toBe(1)
  })

  it('isDone is true at/after stepMs and false before', () => {
    expect(isDone(1999, 2000)).toBe(false)
    expect(isDone(2000, 2000)).toBe(true)
  })
})
