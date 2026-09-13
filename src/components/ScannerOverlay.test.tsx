import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../i18n'   // 与其他组件测试相同的包裹方式
import { AppProvider } from '../state/AppContext'
import { useApp } from '../state/useApp'
import { FACES } from '../lib/cube'
import { COLOR_HEX } from '../lib/colors'
import type { Color, Face } from '../types'
import type { ScanResult } from '../lib/scan/pipeline'
import { ScannerOverlay } from './ScannerOverlay'

const scanFace = vi.fn()
vi.mock('../lib/scan/pipeline', () => ({ scanFace: (...a: unknown[]) => scanFace(...a) }))
const imageDataFromFile = vi.fn()
vi.mock('../lib/scan/capture', () => ({
  grabVideoFrame: () => { throw new Error('no video in jsdom') },
  imageDataFromFile: (...a: unknown[]) => imageDataFromFile(...a),
}))

// jsdom 会把 style.background 规范化成 rgb(...) 形式
const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

// ScanResult.ok.cells 是 3×3 嵌套结构（ScanCell[][]），把 9 色按行切成 3 行
const flatCells = (colors: Color[]) => colors.map(c => ({ color: c, confidence: 1, low: false }))
const asResult = (colors: Color[], center: Color): ScanResult => ({
  ok: true,
  center,
  cells: [flatCells(colors.slice(0, 3)), flatCells(colors.slice(3, 6)), flatCells(colors.slice(6, 9))],
})

// 中心格与 cells[1][1] 同源（真实 pipeline 由 cells[1][1] 得出 center）
const OK_U = asResult(['W', 'O', 'G', 'R', 'W', 'Y', 'G', 'W', 'R'], 'W')
const OK_D = asResult(['Y', 'G', 'O', 'R', 'Y', 'B', 'W', 'G', 'R'], 'Y')

// 探针：把每面 8 个非中心格暴露成 data-testid="probe-<F>"（'-' 表示空）
function Probe() {
  const { cube } = useApp()
  return (
    <div>
      {FACES.map(f => (
        <span key={f} data-testid={`probe-${f}`}>
          {cube[f].map((x, i) => (i === 4 ? '' : x ?? '-')).join('')}
        </span>
      ))}
    </div>
  )
}

// 预置 rc.paint（与 lib/storage 的结构一致）：done 里的面按中心色填满
const CENTER_COLOR: Record<Face, Color> = { U: 'W', D: 'Y', L: 'O', R: 'R', F: 'G', B: 'B' }
function seedStore(done: Face[]) {
  const cube = Object.fromEntries(FACES.map(f => [
    f,
    Array.from({ length: 9 }, (_, i) => (i === 4 || done.includes(f) ? CENTER_COLOR[f] : null)),
  ]))
  localStorage.setItem('rc.paint', JSON.stringify(cube))
}

function mount(opts: { seedU?: boolean } = {}) {
  seedStore(opts.seedU ? ['U'] : [])
  render(
    <I18nProvider>
      <AppProvider>
        <ScannerOverlay onClose={() => {}} />
        <Probe />
      </AppProvider>
    </I18nProvider>,
  )
}

// jsdom 无相机 → 走上传回退：往 scan-file 塞一个文件并触发 change
async function upload() {
  const input = (await screen.findByTestId('scan-file')) as HTMLInputElement
  const file = new File(['x'], 'c.jpg', { type: 'image/jpeg' })
  await act(async () => {
    Object.defineProperty(input, 'files', { value: [file] })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await waitFor(() => expect(scanFace).toHaveBeenCalled())
}

const pickFace = (f: Face) => act(() => { screen.getByTestId(`scan-face-${f}`).click() })

beforeEach(() => {
  localStorage.clear()
  scanFace.mockReset()
  imageDataFromFile.mockReset()
  imageDataFromFile.mockResolvedValue(new ImageData(8, 8))
})

describe('ScannerOverlay', () => {
  it('opens on the pick step with 6 chips; first incomplete face preselected', async () => {
    mount({ seedU: true })
    expect(await screen.findByText('选择要拍的面')).toBeTruthy()
    for (const f of FACES) expect(screen.getByTestId(`scan-face-${f}`)).toBeTruthy()
    // 已填满的 U 打 ✓；自动预选按 FACES 顺序落到第一个未填满的 D
    expect(screen.getByTestId('scan-face-done-U')).toBeTruthy()
    expect(screen.getByTestId('scan-face-D').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('scan-face-U').getAttribute('aria-pressed')).toBe('false')
  })

  it('picking F shows the orientation cross with expected dot colors', async () => {
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('F')
    const dotBg = (dir: string) =>
      (screen.getByTestId('scan-cross').querySelector(`[data-dir="${dir}"]`) as HTMLElement).style.background
    // F 面正面视角：中心 G；上 U(W)、右 R、下 D(Y)、左 L(O) —— ADJACENT[F]
    expect(screen.getByTestId('scan-cross').querySelectorAll('i')).toHaveLength(5)
    expect(dotBg('center')).toBe(rgbOf(COLOR_HEX.G))
    expect(dotBg('up')).toBe(rgbOf(COLOR_HEX.W))
    expect(dotBg('right')).toBe(rgbOf(COLOR_HEX.R))
    expect(dotBg('down')).toBe(rgbOf(COLOR_HEX.Y))
    expect(dotBg('left')).toBe(rgbOf(COLOR_HEX.O))
  })

  it('scan OK → confirm writes setFace and returns to pick with next incomplete selected', async () => {
    scanFace.mockReturnValue(OK_D)
    mount({ seedU: true })
    await screen.findByText('选择要拍的面')
    pickFace('D')
    await upload()
    await screen.findByTestId('scan-grid')
    await act(async () => { screen.getByTestId('scan-confirm').click() })
    // D 面被整体写入（探针显示 8 个非中心格全有值），回到选面步
    expect(screen.getByTestId('probe-D').textContent).toBe('YGORBWGR')
    expect(await screen.findByText('选择要拍的面')).toBeTruthy()
    expect(screen.getByTestId('scan-face-done-D')).toBeTruthy()
    // U、D 已满 → 下一个未填满是 L
    expect(screen.getByTestId('scan-face-L').getAttribute('aria-pressed')).toBe('true')
  })

  it('rotate button is gone; cross still rendered in the result view', async () => {
    scanFace.mockReturnValue(OK_U)
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    await upload()
    await screen.findByTestId('scan-grid')
    expect(screen.queryByTestId('scan-rotate')).toBeNull()
    expect(screen.getByTestId('scan-cross')).toBeTruthy()
  })

  it('scanned center ≠ selected face center still shows the mismatch warning', async () => {
    scanFace.mockReturnValue(asResult(['W', 'O', 'G', 'R', 'Y', 'Y', 'G', 'W', 'R'], 'Y'))
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    await upload()
    expect(await screen.findByTestId('scan-warn')).toBeTruthy()
  })

  it('decode failure shows guidance; retake returns to live view with video still mounted', async () => {
    imageDataFromFile.mockRejectedValueOnce(new Error('bad image'))
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    const input = await screen.findByTestId('scan-file')
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [new File(['x'], 'c.jpg', { type: 'image/jpeg' })] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await waitFor(() => expect(screen.getByTestId('scan-error')).toBeTruthy())
    expect(scanFace).not.toHaveBeenCalled()
    await act(async () => { screen.getByTestId('scan-retake').click() })
    // 黑屏回归：重拍后 <video> 仍在文档中（常驻挂载，不重新取流）
    expect(screen.getByTestId('scan-video')).toBeTruthy()
    expect(await screen.findByText('上传图片')).toBeTruthy()
  })

  it('color fix writes the fixed color into the same display slot on confirm', async () => {
    scanFace.mockReturnValue(OK_U)
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    await upload()
    await screen.findByTestId('scan-grid')
    // 修正显示格 0（原色 W → Y），确认后 0 号槽位写入 Y（无旋转，显示序即写入序）
    await act(async () => { screen.getByTestId('scan-cell-0').click() })
    const chip = screen.getByTestId('scan-fix').querySelector('button[data-color="Y"]') as HTMLButtonElement
    await act(async () => { chip.click() })
    await act(async () => { screen.getByTestId('scan-confirm').click() })
    expect(screen.getByTestId('probe-U').textContent).toBe('YOGRYGWR')
  })
})
