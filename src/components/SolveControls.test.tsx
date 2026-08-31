import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SolveControls } from './SolveControls'
import { I18nProvider } from '../i18n'

describe('SolveControls', () => {
  it('renders a speed slider labeled with seconds per step', () => {
    render(
      <I18nProvider>
        <SolveControls index={0} total={5} playing={false} stepMs={2000}
          onStepMs={() => {}} onPrev={() => {}} onNext={() => {}} onPlay={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getByText(/秒\/步/)).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveAttribute('min', '1')
    expect(screen.getByRole('slider')).toHaveAttribute('max', '5')
    expect(screen.getByRole('slider')).toHaveAttribute('step', '0.5')
  })
  it('moving the slider calls onStepMs with ms', () => {
    const onStepMs = vi.fn()
    render(
      <I18nProvider>
        <SolveControls index={0} total={5} playing={false} stepMs={2000}
          onStepMs={onStepMs} onPrev={() => {}} onNext={() => {}} onPlay={() => {}} />
      </I18nProvider>,
    )
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } })
    expect(onStepMs).toHaveBeenCalledWith(3000)
  })
})
