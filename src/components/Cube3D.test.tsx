import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

// Mock @react-three/fiber Canvas so we never touch WebGL in jsdom.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) =>
    <div data-testid="canvas">{children}</div>,
}))

import { Cube3D, cubieMeshData } from './Cube3D'
import { solvedCube } from '../lib/cube'

describe('Cube3D', () => {
  it('cubieMeshData returns 27 entries with positions and 6 face colors', () => {
    const data = cubieMeshData(solvedCube())
    expect(data).toHaveLength(27)
    expect(data[0].faceColors).toHaveLength(6)
  })

  it('Cube3D does not throw and renders a Canvas shell', () => {
    const { container } = render(
      <Cube3D cube={solvedCube()} pendingMove={null} stepMs={2000} />,
    )
    expect(container.querySelector('[data-testid="canvas"]')).toBeTruthy()
  })
})
