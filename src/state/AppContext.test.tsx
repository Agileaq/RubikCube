import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'

function Probe() {
  const { remaining, brush, setBrush, paintSticker, orientation, flip } = useApp()
  return (
    <div>
      <span data-testid="brush">{brush}</span>
      <span data-testid="remW">{remaining.W}</span>
      <span data-testid="orient">{orientation}</span>
      <button onClick={() => setBrush('W')}>bw</button>
      <button onClick={() => paintSticker('U', 0)}>paint</button>
      <button onClick={flip}>flip</button>
    </div>
  )
}

describe('AppContext', () => {
  beforeEach(() => localStorage.clear())

  it('painting a sticker with white brush decrements white remaining', () => {
    render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByTestId('remW').textContent).toBe('8')
    act(() => { screen.getByText('bw').click() })
    act(() => { screen.getByText('paint').click() })
    expect(screen.getByTestId('brush').textContent).toBe('W')
    expect(screen.getByTestId('remW').textContent).toBe('7')
  })

  it('flip toggles orientation', () => {
    render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByTestId('orient').textContent).toBe('default')
    act(() => { screen.getByText('flip').click() })
    expect(screen.getByTestId('orient').textContent).toBe('flipped')
  })
})
