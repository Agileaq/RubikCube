import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../state/AppContext'
import Paint from './Paint'

function renderPaint() {
  return render(<MemoryRouter><AppProvider><Paint /></AppProvider></MemoryRouter>)
}

describe('Paint screen', () => {
  beforeEach(() => localStorage.clear())

  it('shows the 填色 prompt, hint line, and tutorial link', () => {
    renderPaint()
    expect(screen.getByText('填色')).toBeInTheDocument()
    expect(screen.getByText('请根据手上魔方各面颜色对图中魔方进行填色')).toBeInTheDocument()
    expect(screen.getByLabelText('教程')).toBeInTheDocument()
  })

  it('does not show solve link or unsolvable message on an empty cube', () => {
    renderPaint()
    expect(screen.queryByText('开始复原')).not.toBeInTheDocument()
    expect(screen.queryByText(/填色状态不可解/)).not.toBeInTheDocument()
  })
})
