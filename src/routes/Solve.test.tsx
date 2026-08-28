import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '../state/AppContext'
import Solve from './Solve'

// Seed a solved cube into storage so validation passes and solve() is trivial.
import { solvedCube } from '../lib/cube'

function renderSolve() {
  localStorage.setItem('rc.paint', JSON.stringify(solvedCube()))
  return render(
    <MemoryRouter initialEntries={['/solve']}>
      <AppProvider>
        <Routes>
          <Route path="/solve" element={<Solve />} />
          <Route path="/" element={<div>PAINT</div>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('Solve screen', () => {
  beforeEach(() => localStorage.clear())

  it('renders controls and a back-to-paint link for a solvable cube', () => {
    renderSolve()
    expect(screen.getByText('返回填色')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /下一步|完成/ })).toBeInTheDocument()
  })
})
