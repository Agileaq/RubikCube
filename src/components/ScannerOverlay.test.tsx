import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { I18nProvider } from '../i18n'   // 与其他组件测试相同的包裹方式
import { AppProvider } from '../state/AppContext'
import { useApp } from '../state/useApp'
import { FACES, SCAN_FACE_ORDER } from '../lib/cube'
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
const OK_L = asResult(['O', 'G', 'W', 'B', 'O', 'R', 'Y', 'O', 'G'], 'O')
// 重扫 D 的另一组结果（与 OK_D 多数格不同，用于断言暂存被覆盖）
const AGAIN_D = asResult(['R', 'R', 'R', 'G', 'Y', 'G', 'W', 'W', 'W'], 'Y')
// 0 号格低置信（红框警示），人工改色后应清除
const LOW_U = (() => {
  const r = asResult(['W', 'O', 'G', 'R', 'W', 'Y', 'G', 'W', 'R'], 'W')
  r.cells[0][0] = { color: 'W', confidence: 0.1, low: true }
  return r
})()

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

// 预置 rc.paint（与 lib/storage 的结构一致）：done 里的面按中心色填满；
// partial 指定面的指定格预填颜色（其余非中心格留空）
const CENTER_COLOR: Record<Face, Color> = { U: 'W', D: 'Y', L: 'O', R: 'R', F: 'G', B: 'B' }
function seedStore(done: Face[], partial: Partial<Record<Face, Record<number, Color>>> = {}) {
  const cube = Object.fromEntries(FACES.map(f => [
    f,
    Array.from({ length: 9 }, (_, i) => (
      i === 4 || done.includes(f) ? CENTER_COLOR[f] : partial[f]?.[i] ?? null
    )),
  ]))
  localStorage.setItem('rc.paint', JSON.stringify(cube))
}

function mount(opts: { seedU?: boolean; partial?: Partial<Record<Face, Record<number, Color>>>; onClose?: () => void } = {}) {
  seedStore(opts.seedU ? ['U'] : [], opts.partial)
  render(
    <I18nProvider>
      <AppProvider>
        <ScannerOverlay onClose={opts.onClose ?? (() => {})} />
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
// 结果页「加入」：暂存当前面并回枢纽
async function stageIt() {
  await screen.findByTestId('scan-grid')
  await act(async () => { screen.getByTestId('scan-stage').click() })
}
// 枢纽缩略图第 i 格的背景色
const thumbCell = (f: Face, i: number) =>
  (screen.getByTestId(`scan-thumb-${f}`).querySelectorAll('i')[i] as HTMLElement).style.background

beforeEach(() => {
  localStorage.clear()
  scanFace.mockReset()
  imageDataFromFile.mockReset()
  imageDataFromFile.mockResolvedValue(new ImageData(8, 8))
})

describe('ScannerOverlay', () => {
  it('hub with nothing staged: 6 chips, confirm-all enabled, first incomplete auto-selected', async () => {
    mount()
    expect(await screen.findByText('选择要拍的面')).toBeTruthy()
    for (const f of FACES) expect(screen.getByTestId(`scan-face-${f}`)).toBeTruthy()
    expect((screen.getByTestId('scan-confirm-all') as HTMLButtonElement).disabled).toBe(false)
    // 拍色顺序（SCAN_FACE_ORDER）第一个未填满的面（空仓 → U）自动预选
    expect(screen.getByTestId('scan-face-U').getAttribute('aria-pressed')).toBe('true')
    // 槽位顺序：第一排 白/橙/绿（U/L/F），第二排 红/蓝/黄（R/B/D）
    const chips = screen.getAllByTestId(/^(scan-face-[UDLRFB]|scan-thumb-[UDLRFB])$/)
    const rendered = chips.map(el => (el as HTMLElement).getAttribute('data-testid')!.replace('scan-thumb-', '').replace('scan-face-', ''))
    expect(rendered).toEqual([...SCAN_FACE_ORDER])
  })

  it('confirm-all is always pressable: with nothing staged it closes without touching the store', async () => {
    const onClose = vi.fn()
    mount({ partial: { F: { 0: 'R', 8: 'B' } }, onClose })
    await screen.findByText('选择要拍的面')
    const btn = screen.getByTestId('scan-confirm-all') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    await act(async () => { btn.click() })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('probe-F').textContent).toBe('R------B')
  })

  it('store-complete face shows ✓ and is skipped by auto-select while incomplete faces exist', async () => {
    mount({ seedU: true })
    await screen.findByText('选择要拍的面')
    // U 已填满 → 显示迷你缩略图 + ✓（不再是纯色 chip）
    expect(screen.getByTestId('scan-face-done-U')).toBeTruthy()
    expect(screen.getByTestId('scan-thumb-U')).toBeTruthy()
    expect(screen.getByTestId('scan-thumb-U').getAttribute('aria-pressed')).toBe('false')
    // U 满 → 拍色顺序下一个是 L（不是 D）
    expect(screen.getByTestId('scan-face-L').getAttribute('aria-pressed')).toBe('true')
  })

  it('partially filled face shows its stored colors in the hub (nulls fall back to center color)', async () => {
    mount({ partial: { F: { 0: 'R', 8: 'B' } } })
    await screen.findByText('选择要拍的面')
    // F 已有格子填色 → 显示迷你缩略图，不再是无色 chip
    expect(screen.queryByTestId('scan-face-F')).toBeNull()
    const thumb = screen.getByTestId('scan-thumb-F')
    const cells = thumb.querySelectorAll('i')
    expect((cells[0] as HTMLElement).style.background).toBe(rgbOf(COLOR_HEX.R))
    expect((cells[1] as HTMLElement).style.background).toBe(rgbOf(COLOR_HEX.G))
    expect((cells[8] as HTMLElement).style.background).toBe(rgbOf(COLOR_HEX.B))
    // 未填满 → 无 ✓；点按仍可进入拍照
    expect(screen.queryByTestId('scan-face-done-F')).toBeNull()
    await act(async () => { thumb.click() })
    expect(await screen.findByText('上传图片')).toBeTruthy()
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

  it('加入 stages the scanned face; confirm-all writes it to the store and closes', async () => {
    const onClose = vi.fn()
    scanFace.mockReturnValue(OK_D)
    mount({ seedU: true, onClose })
    await screen.findByText('选择要拍的面')
    pickFace('D')
    await upload()
    await stageIt()
    // 回到枢纽：D 显示迷你缩略图，格色 = 扫描结果（空中心格显中心色）
    expect(thumbCell('D', 0)).toBe(rgbOf(COLOR_HEX.Y))
    expect(thumbCell('D', 2)).toBe(rgbOf(COLOR_HEX.O))
    expect(thumbCell('D', 4)).toBe(rgbOf(COLOR_HEX.Y))
    // U 已满、D 已暂存 → 自动预选 L；暂存 ≥1 → 总确认可用
    expect(screen.getByTestId('scan-face-L').getAttribute('aria-pressed')).toBe('true')
    const all = screen.getByTestId('scan-confirm-all') as HTMLButtonElement
    expect(all.disabled).toBe(false)
    await act(async () => { all.click() })
    expect(screen.getByTestId('probe-D').textContent).toBe('YGORBWGR')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('staging two faces then confirm-all writes both and closes once', async () => {
    const onClose = vi.fn()
    scanFace.mockReturnValueOnce(OK_D).mockReturnValueOnce(OK_L)
    mount({ seedU: true, onClose })
    await screen.findByText('选择要拍的面')
    pickFace('D')
    await upload()
    await stageIt()
    // L 已被自动预选（U 满、D 已暂存），直接点 chip 进扫描
    pickFace('L')
    await upload()
    await stageIt()
    expect(screen.getByTestId('scan-thumb-D')).toBeTruthy()
    expect(screen.getByTestId('scan-thumb-L')).toBeTruthy()
    await act(async () => { screen.getByTestId('scan-confirm-all').click() })
    expect(screen.getByTestId('probe-D').textContent).toBe('YGORBWGR')
    expect(screen.getByTestId('probe-L').textContent).toBe('OGWBRYOG')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('re-scanning a staged face replaces the staged entry; store untouched until confirm-all', async () => {
    scanFace.mockReturnValueOnce(OK_D).mockReturnValueOnce(AGAIN_D)
    mount({ seedU: true })
    await screen.findByText('选择要拍的面')
    pickFace('D')
    await upload()
    await stageIt()
    expect(thumbCell('D', 0)).toBe(rgbOf(COLOR_HEX.Y))
    // 点缩略图重扫同一面，再次「加入」覆盖暂存
    await act(async () => { screen.getByTestId('scan-thumb-D').click() })
    await upload()
    await stageIt()
    expect(thumbCell('D', 0)).toBe(rgbOf(COLOR_HEX.R))
    expect(thumbCell('D', 7)).toBe(rgbOf(COLOR_HEX.W))
    // 总确认前不写 store
    expect(screen.getByTestId('probe-D').textContent).toBe('--------')
    await act(async () => { screen.getByTestId('scan-confirm-all').click() })
    expect(screen.getByTestId('probe-D').textContent).toBe('RRRGGWWW')
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

  it('color fix lands in the same display slot through staging and confirm-all', async () => {
    scanFace.mockReturnValue(OK_U)
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    await upload()
    await screen.findByTestId('scan-grid')
    // 修正显示格 0（原色 W → Y）：先点色圆选 Y，再点格；加入后缩略图 0 号格变 Y，
    // 总确认写入同一槽位（显示序即写入序）
    const chip = screen.getByTestId('scan-fix').querySelector('button[data-color="Y"]') as HTMLButtonElement
    await act(async () => { chip.click() })
    await act(async () => { screen.getByTestId('scan-cell-0').click() })
    await act(async () => { screen.getByTestId('scan-stage').click() })
    expect(thumbCell('U', 0)).toBe(rgbOf(COLOR_HEX.Y))
    await act(async () => { screen.getByTestId('scan-confirm-all').click() })
    expect(screen.getByTestId('probe-U').textContent).toBe('YOGRYGWR')
  })

  it('palette is always visible; a cell repaints only after a brush color is picked', async () => {
    scanFace.mockReturnValue(OK_U)
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    await upload()
    const palette = await screen.findByTestId('scan-fix')
    expect(palette.querySelectorAll('button')).toHaveLength(6)
    // 未选色时点色块：无动作
    await act(async () => { screen.getByTestId('scan-cell-0').click() })
    expect(screen.getByTestId('scan-cell-0').style.background).toBe(rgbOf(COLOR_HEX.W))
    // 先选色圆（active 高亮），再点色块 → 改色；笔刷保持可连续改
    const chipY = palette.querySelector('button[data-color="Y"]') as HTMLButtonElement
    await act(async () => { chipY.click() })
    expect(chipY.className).toContain('active')
    expect(screen.getByTestId('scan-cell-0').style.background).toBe(rgbOf(COLOR_HEX.W))
    await act(async () => { screen.getByTestId('scan-cell-0').click() })
    await act(async () => { screen.getByTestId('scan-cell-1').click() })
    expect(screen.getByTestId('scan-cell-0').style.background).toBe(rgbOf(COLOR_HEX.Y))
    expect(screen.getByTestId('scan-cell-1').style.background).toBe(rgbOf(COLOR_HEX.Y))
  })

  it('painting a low-confidence cell with a selected brush clears its red border', async () => {
    scanFace.mockReturnValue(LOW_U)
    mount()
    await screen.findByText('选择要拍的面')
    pickFace('U')
    await upload()
    const cell0 = await screen.findByTestId('scan-cell-0')
    expect(cell0.className).toContain('low')
    const chipB = screen.getByTestId('scan-fix').querySelector('button[data-color="B"]') as HTMLButtonElement
    await act(async () => { chipB.click() })
    await act(async () => { cell0.click() })
    const after = screen.getByTestId('scan-cell-0')
    expect(after.className).not.toContain('low')
    expect(after.style.background).toBe(rgbOf(COLOR_HEX.B))
  })
})
