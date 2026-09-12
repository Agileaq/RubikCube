import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '../state/AppContext'
import { I18nProvider } from '../i18n'
import Solve, { stepIndexFor } from './Solve'

// Real Cube3D pulls @react-three/fiber (WebGL) — mock the whole module so the
// Solve test only exercises the route's step/wiring logic. Surface pendingMove
// via a data attr so we can assert a scrambled cube animates a real move.
vi.mock('../components/Cube3D', () => ({
  Cube3D: (props: any) => (
    <div data-testid="canvas" data-pending={JSON.stringify(props.pendingMove)} />
  ),
}))

import { solvedCube } from '../lib/cube'
import { applyMoves, parseMoves } from '../lib/moves'

function renderSolve() {
  // Seed a lightly-scrambled cube so solve() returns at least one move and the
  // pendingMove data attr is non-null. (A solved cube yields 0 moves.)
  localStorage.setItem('rc.paint', JSON.stringify(applyMoves(solvedCube(), parseMoves('R'))))
  return render(
    <MemoryRouter initialEntries={['/solve']}>
      <I18nProvider>
        <AppProvider>
          <Routes>
            <Route path="/solve" element={<Solve />} />
            <Route path="/" element={<div>PAINT</div>} />
          </Routes>
        </AppProvider>
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('Solve screen', () => {
  beforeEach(() => localStorage.clear())

  it('renders the 3D canvas for a solvable cube (after async solve resolves)', async () => {
    renderSolve()
    // The solve() runs in an effect (idle/timeout), so the route briefly shows
    // "正在准备复原…" while preparing. Wait for the canvas to mount.
    const canvas = await screen.findByTestId('canvas')
    expect(canvas).toBeTruthy()
    expect(screen.getByText('返回填色')).toBeInTheDocument()
  })

  it('renders controls and a back-to-paint link for a solvable cube', async () => {
    renderSolve()
    // Wait for the async solve to finish and the controls to render.
    await waitFor(() => expect(screen.getByRole('button', { name: /下一步|完成/ })).toBeInTheDocument())
    expect(screen.getByText('返回填色')).toBeInTheDocument()
  })

  // The stage caption must describe the sub-goal the UPCOMING move belongs to.
  // At a step boundary (all of step s executed, first move of step s+1 is next)
  // the caption must already switch to step s+1's stage — with the old
  // `i <= acc + len` comparison it lagged one step behind, explaining the
  // PREVIOUS sub-goal over a move from the next one. When every move is done
  // (i = total) the caption stays on the final stage.
  it('maps move index to the step owning the upcoming move', () => {
    const steps = [
      { stage: 'S0', moves: [{ face: 'R', dir: 1 }, { face: 'U', dir: 1 }, { face: 'F', dir: 1 }] },
      { stage: 'S1', moves: [{ face: 'L', dir: 1 }, { face: 'D', dir: 1 }] },
      { stage: 'S2', moves: [{ face: 'B', dir: 1 }] },
    ] as any
    expect(stepIndexFor(steps, 0)).toBe(0) // first move of step 0
    expect(stepIndexFor(steps, 2)).toBe(0) // last move of step 0
    expect(stepIndexFor(steps, 3)).toBe(1) // boundary → first move of step 1
    expect(stepIndexFor(steps, 4)).toBe(1)
    expect(stepIndexFor(steps, 5)).toBe(2) // boundary → the only move of step 2
    expect(stepIndexFor(steps, 6)).toBe(2) // done → stays on the final stage
  })
})
