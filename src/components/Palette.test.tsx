import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Palette } from './Palette'

const remaining = { Y:8, R:7, B:8, W:0, O:8, G:8 } as const

describe('Palette', () => {
  it('renders six circles in order Y,R,B,W,O,G with counts', () => {
    render(<Palette remaining={remaining} brush="W" onPick={() => {}} />)
    const circles = screen.getAllByRole('button')
    expect(circles).toHaveLength(6)
    expect(circles[0]).toHaveAttribute('data-color', 'Y')
    expect(circles[3]).toHaveAttribute('data-color', 'W')
    expect(circles[3].textContent).toBe('0')
    expect(circles[1].textContent).toBe('7')
  })

  it('clicking a circle picks that color', () => {
    const onPick = vi.fn()
    render(<Palette remaining={remaining} brush="W" onPick={onPick} />)
    screen.getAllByRole('button')[0].click()
    expect(onPick).toHaveBeenCalledWith('Y')
  })

  it('marks the active brush', () => {
    render(<Palette remaining={remaining} brush="R" onPick={() => {}} />)
    expect(screen.getAllByRole('button')[1].className).toContain('active')
  })
})
