import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { COLOR_HEX, COLOR_ORDER } from '../lib/colors'
import { ADJACENT, CENTERS, FACES } from '../lib/cube'
import { useApp } from '../state/useApp'
import { grabVideoFrame, imageDataFromFile } from '../lib/scan/capture'
import { scanFace, type ScanResult, type ScanCell } from '../lib/scan/pipeline'
import type { Color, CubeState, Face } from '../types'

// 面名/色名仅在警示文案里插值：中文用汉字，其他语言用单字母（不新增 i18n 键）
const COLOR_NAME: Record<Color, string> = { W: '白', Y: '黄', R: '红', O: '橙', G: '绿', B: '蓝' }

// 面是否已填满（8 个非中心格全部有值）
const faceDone = (cube: CubeState, f: Face) => cube[f].every((x, i) => i === 4 || x !== null)
// 打开时自动预选：FACES 顺序第一个未填满的面；全部填满则回退 U
const firstPick = (cube: CubeState): Face => FACES.find(f => !faceDone(cube, f)) ?? 'U'
// 确认后回到选面步：刚填的面视为已填满，取下一个未填满面；全满则保留刚扫的面
const nextPick = (cube: CubeState, justDone: Face): Face =>
  FACES.find(f => f !== justDone && !faceDone(cube, f)) ?? justDone

// 方位提示十字：中心点=该面中心色，四臂=标准面向视角下各边相邻面的中心色
// （修订 2：按十字握持魔方即可对齐朝向，取代旋转按钮；纯视觉，无文字）
function OrientationCross({ face }: { face: Face }) {
  const a = ADJACENT[face]
  const dots = [
    { dir: 'center', row: 2, col: 2, hex: COLOR_HEX[CENTERS[face]] },
    { dir: 'up', row: 1, col: 2, hex: COLOR_HEX[CENTERS[a.up]] },
    { dir: 'right', row: 2, col: 3, hex: COLOR_HEX[CENTERS[a.right]] },
    { dir: 'down', row: 3, col: 2, hex: COLOR_HEX[CENTERS[a.down]] },
    { dir: 'left', row: 2, col: 1, hex: COLOR_HEX[CENTERS[a.left]] },
  ]
  return (
    <div className="scan-cross" data-testid="scan-cross" aria-hidden="true">
      {dots.map(d => (
        <i key={d.dir} data-dir={d.dir}
          style={{ gridRow: d.row, gridColumn: d.col, background: d.hex }} />
      ))}
    </div>
  )
}

export function ScannerOverlay({ onClose }: { onClose(): void }) {
  const { t, locale } = useI18n()
  const { cube, setFace } = useApp()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraDenied, setCameraDenied] = useState(false)
  const [step, setStep] = useState<'pick' | 'scan'>('pick')
  const [face, selectFace] = useState<Face>(() => firstPick(cube))
  const [result, setResult] = useState<ScanResult | null>(null)
  const [decodeFailed, setDecodeFailed] = useState(false)
  const [fixing, setFixing] = useState<number | null>(null)
  // 修正色按显示格下标平铺存储（修订 2：旋转已移除，显示序即写入序）
  const [overrides, setOverrides] = useState<Record<number, Color>>({})

  useEffect(() => {
    let dead = false
    const md = navigator.mediaDevices
    if (!md?.getUserMedia) { setCameraDenied(true); return }
    md.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
      if (dead) { stream.getTracks().forEach(tr => tr.stop()); return }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    }).catch(() => { if (!dead) setCameraDenied(true) })
    return () => { dead = true; streamRef.current?.getTracks().forEach(tr => tr.stop()) }
  }, [])

  const runScan = useCallback((img: ImageData) => {
    setResult(scanFace(img))
    setFixing(null); setOverrides({})
  }, [])

  const onCapture = () => {
    const v = videoRef.current
    if (v && v.videoWidth > 0) runScan(grabVideoFrame(v))
  }
  // 图像解码失败走独立 decodeFailed 引导 + 重拍路径（定点采样恒成功，无识别失败分支）
  const onFile = (f: File | undefined) => {
    if (f) imageDataFromFile(f).then(runScan).catch(() => setDecodeFailed(true))
  }

  const cells: (ScanCell | null)[][] = result?.cells ?? []
  const flat = cells.flat()
  // result.center 与 result.cells[1][1].color 同源（见 pipeline.ts），直接用中心字段
  const centerColor = result?.center ?? null
  const mismatch = centerColor !== null && centerColor !== CENTERS[face]
  const complete = result !== null && flat.every(c => c !== null)
  const name = (c: Color) => (locale === 'zh' ? COLOR_NAME[c] : c)

  const confirm = () => {
    if (!complete) return
    setFace(face, flat.map((c, i) => (i === 4 ? null : overrides[i] ?? c!.color)))
    setResult(null); setFixing(null); setOverrides({})
    selectFace(nextPick(cube, face))
    setStep('pick')
  }

  const retake = () => { setResult(null); setDecodeFailed(false) }

  // 上传控件只定义一次；相机可用/被拒两种状态下都只渲染这一个 scan-file 输入
  const uploadControl = (
    <label className="solve-link">
      {t.scan.upload}
      <input type="file" accept="image/*" data-testid="scan-file" hidden
        onChange={e => onFile(e.target.files?.[0])} />
    </label>
  )

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true">
      <div className="scanner-panel">
        <h2>
          {step === 'scan' && (
            // 结果核对时的期望中心色点（见色警示的视觉基准）
            <span className="scan-center-dot" aria-hidden="true"
              style={{ background: COLOR_HEX[CENTERS[face]] }} />
          )}
          {step === 'pick' ? t.scan.chooseFace : t.scan.title}
        </h2>
        <button className="scanner-close" aria-label={t.scan.cancel} onClick={onClose}>✕</button>
        {/* 相机流常驻挂载：选面步仅隐藏取景器（display:none），重拍后重新显示同一
            <video> 即可恢复画面，无需重新取流（黑屏回归修复）。
            iOS 真机加固 #3：playsInline/muted/autoPlay 缺一不可 */}
        <div className="scan-viewfinder" style={{ display: step === 'scan' ? undefined : 'none' }}>
          <video ref={videoRef} playsInline muted autoPlay data-testid="scan-video"
            style={{ display: result || decodeFailed || cameraDenied ? 'none' : undefined }} />
          {/* 取景引导框：与 pipeline 的 GUIDE_FRAC 同为 78%（styles.css），所见即采样 */}
          {step === 'scan' && !result && !decodeFailed && !cameraDenied && (
            <div className="scan-guide" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
            </div>
          )}
        </div>
        {step === 'pick' && (
          <div className="pick-grid">
            {FACES.map(f => (
              <button key={f} data-testid={`scan-face-${f}`} aria-label={f}
                aria-pressed={f === face}
                className={'face-chip' + (f === face ? ' active' : '')}
                style={{ background: COLOR_HEX[CENTERS[f]] }}
                onClick={() => { selectFace(f); setStep('scan') }}>
                {faceDone(cube, f) && (
                  <span className="face-done" data-testid={`scan-face-done-${f}`}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
        {step === 'scan' && !result && !decodeFailed && (
          <div className="scanner-live">
            <OrientationCross face={face} />
            {!cameraDenied && <p className="scan-hint">{t.scan.alignHint}</p>}
            {!cameraDenied ? (
              <div className="scanner-actions">
                <button className="solve-link" onClick={onCapture}>{t.scan.capture}</button>
                {uploadControl}
              </div>
            ) : (
              <p className="scan-warn" data-testid="scan-camera-denied">{t.scan.cameraDenied}</p>
            )}
            {cameraDenied && (
              <div className="scanner-actions">{uploadControl}</div>
            )}
          </div>
        )}
        {step === 'scan' && !result && decodeFailed && (
          <div>
            <p className="scan-warn" data-testid="scan-error">{t.scan.notRecognized}</p>
            <div className="scanner-actions">
              <button className="solve-link" data-testid="scan-retake" onClick={retake}>{t.scan.retake}</button>
            </div>
          </div>
        )}
        {step === 'scan' && result && (
          <div>
            {mismatch && (
              <p className="scan-warn" data-testid="scan-warn">
                {t.scan.centerMismatch
                  .replace('{x}', name(centerColor as Color))
                  .replace('{f}', name(CENTERS[face]))}
              </p>
            )}
            <div className="scan-grid" data-testid="scan-grid">
              {cells.map((row, r) => row.map((cell, c) => {
                const i = r * 3 + c
                const color = overrides[i] ?? cell?.color ?? null
                return (
                  <button key={i} data-testid={`scan-cell-${i}`}
                    className={'scan-cell' + (cell?.low ? ' low' : '')}
                    style={{ background: color ? COLOR_HEX[color] : 'transparent' }}
                    disabled={i === 4}
                    onClick={i === 4 ? undefined : () => setFixing(i)} />
                )
              }))}
            </div>
            <OrientationCross face={face} />
            {fixing !== null && (
              <div className="scan-fix" data-testid="scan-fix">
                {COLOR_ORDER.map(col => (
                  <button key={col} className="chip" data-color={col}
                    style={{ background: COLOR_HEX[col] }}
                    onClick={() => {
                      setOverrides(o => ({ ...o, [fixing]: col }))
                      setFixing(null)
                    }} />
                ))}
              </div>
            )}
            <div className="scanner-actions">
              <button className="solve-link" data-testid="scan-retake" onClick={retake}>{t.scan.retake}</button>
              <button className="solve-link" data-testid="scan-confirm" disabled={!complete} onClick={confirm}>{t.scan.confirm}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
