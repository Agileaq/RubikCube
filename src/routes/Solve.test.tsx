import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '../state/AppContext'
import { I18nProvider } from '../i18n'
import Solve from './Solve'

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

  it('renders the 3D canvas for a solvable cube', () => {
    renderSolve()
    expect(screen.getByText('返回填色')).toBeInTheDocument()
    const canvas = document.querySelector('[data-testid="canvas"]')
    expect(canvas).toBeTruthy()
  })

  it('renders controls and a back-to-paint link for a solvable cube', () => {
    renderSolve()
    expect(screen.getByText('返回填色')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /下一步|完成/ })).toBeInTheDocument()
  })
})
