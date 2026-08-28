import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Cube } from './Cube'
import { emptyCube } from '../lib/cube'

describe('Cube', () => {
  it('renders 27 stickers (3 visible faces x 9) and marks orientation', () => {
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
})
