import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../i18n'   // 与其他组件测试相同的包裹方式
import type { Color, Face } from '../types'
import type { ScanResult } from '../lib/scan/pipeline'
import { ScannerOverlay } from './ScannerOverlay'

const scanFace = vi.fn()
vi.mock('../lib/scan/pipeline', () => ({ scanFace: (...a: unknown[]) => scanFace(...a) }))
vi.mock('../lib/scan/capture', () => ({
  grabVideoFrame: () => { throw new Error('no video in jsdom') },
  imageDataFromFile: () => Promise.resolve(new ImageData(8, 8)),
}))

// ScanResult.ok.cells 是 3×3 嵌套结构（ScanCell[][]），把 9 色按行切成 3 行
const flatCells = (['W', 'O', 'G', 'R', 'B', 'Y', 'G', 'W', 'R'] as Color[])
  .map(c => ({ color: c, confidence: 1, low: false }))

const OK: ScanResult = {
  ok: true,
  center: 'B', // 与 cells[1][1]（中心格 B）一致
  cells: [flatCells.slice(0, 3), flatCells.slice(3, 6), flatCells.slice(6, 9)],
}

function mount(onConfirm = vi.fn(), face: Face = 'U') {
  const onClose = vi.fn()
  render(
    <I18nProvider>
      <ScannerOverlay face={face} onConfirm={onConfirm} onClose={onClose} />
    </I18nProvider>,
  )
  return { onConfirm, onClose }
}

beforeEach(() => scanFace.mockReset())

describe('ScannerOverlay', () => {
  it('falls back to upload mode when camera is unavailable (jsdom)', async () => {
    mount()
    // 精确匹配上传 label（cameraDenied 文案里也含“上传图片”子串，不能用正则）
    expect(await screen.findByText('上传图片')).toBeTruthy()
  })

  it('upload → scan → preview renders 9 colored cells → confirm calls setFace payload', async () => {
    scanFace.mockReturnValue(OK)
    const { onConfirm } = mount(undefined, 'B') // 中心格 B 与 B 面中心一致 → 无警示
    const input = (await screen.findByTestId('scan-file')) as HTMLInputElement
    const file = new File(['x'], 'c.jpg', { type: 'image/jpeg' })
    await act(async () => { await input.files ? null : null })
    Object.defineProperty(input, 'files', { value: [file] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await waitFor(() => expect(scanFace).toHaveBeenCalled())
    await screen.findByTestId('scan-grid')
    expect(screen.queryByTestId('scan-warn')).toBeNull()
    await act(async () => { screen.getByTestId('scan-confirm').click() })
    expect(onConfirm).toHaveBeenCalledWith(['W', 'O', 'G', 'R', null, 'Y', 'G', 'W', 'R'])
  })

  it('center mismatch against the target face shows the warning', async () => {
    scanFace.mockReturnValue({ ...OK, center: 'Y' })
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await waitFor(() => expect(screen.getByTestId('scan-warn')).toBeTruthy())
  })

  it('failed detection shows guidance and retake', async () => {
    scanFace.mockReturnValue({ ok: false, reason: 'blobs' })
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await waitFor(() => expect(screen.getByTestId('scan-error')).toBeTruthy())
    expect(screen.getByTestId('scan-retake')).toBeTruthy()
  })

  it('rotate button cycles the preview grid orientation', async () => {
    scanFace.mockReturnValue(OK)
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await screen.findByTestId('scan-grid')
    const before = screen.getByTestId('scan-cell-0').style.background
    await act(async () => { screen.getByTestId('scan-rotate').click() })
    expect(screen.getByTestId('scan-cell-0').style.background).not.toBe(before)
  })

  it('color fix follows its sticker through rotation (not the display slot)', async () => {
    scanFace.mockReturnValue(OK)
    const { onConfirm } = mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await screen.findByTestId('scan-grid')
    // 修正显示格 0（原色 W → Y）
    await act(async () => { screen.getByTestId('scan-cell-0').click() })
    const fixRow = screen.getByTestId('scan-fix')
    const chip = fixRow.querySelector('button[data-color="Y"]') as HTMLButtonElement
    await act(async () => { chip.click() })
    // 顺时针旋转一次：原 cell-0（带修正 Y）移动到显示槽 2
    await act(async () => { screen.getByTestId('scan-rotate').click() })
    await act(async () => { screen.getByTestId('scan-confirm').click() })
    // 旋转后 flat = [G,R,W, W,B,O, R,Y,G]；槽 2 携带修正色 Y（旧实现会错误地把 Y 留在槽 0）
    expect(onConfirm).toHaveBeenCalledWith(['G', 'R', 'Y', 'W', null, 'O', 'R', 'Y', 'G'])
  })

  it('rotating closes an open fix panel so it cannot write into the wrong slot', async () => {
    scanFace.mockReturnValue(OK)
    mount()
    const input = await screen.findByTestId('scan-file')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await screen.findByTestId('scan-grid')
    await act(async () => { screen.getByTestId('scan-cell-0').click() })
    expect(screen.getByTestId('scan-fix')).toBeTruthy()
    await act(async () => { screen.getByTestId('scan-rotate').click() })
    expect(screen.queryByTestId('scan-fix')).toBeNull()
  })
})
