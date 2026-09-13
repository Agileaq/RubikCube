import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { COLOR_HEX, COLOR_ORDER } from '../lib/colors'
import { CENTERS } from '../lib/cube'
import { grabVideoFrame, imageDataFromFile } from '../lib/scan/capture'
import { scanFace, type ScanResult, type ScanCell } from '../lib/scan/pipeline'
import type { Color, Face } from '../types'

// 面名/色名仅在警示文案里插值：中文用汉字，其他语言用单字母（不新增 i18n 键）
const COLOR_NAME: Record<Color, string> = { W: '白', Y: '黄', R: '红', O: '橙', G: '绿', B: '蓝' }

// 顺时针旋转 3×3 一次
function rot90<T>(g: T[][]): T[][] {
  return [0, 1, 2].map(c => [0, 1, 2].map(r => g[2 - r][c]))
}

export function ScannerOverlay({ face, onConfirm, onClose }: {
  face: Face
  onConfirm(colors: (Color | null)[]): void
  onClose(): void
}) {
  const { t, locale } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraDenied, setCameraDenied] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [rot, setRot] = useState(0)
  const [fixing, setFixing] = useState<number | null>(null)
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
    setRot(0); setFixing(null); setOverrides({})
  }, [])

  const onCapture = () => {
    const v = videoRef.current
    if (v && v.videoWidth > 0) runScan(grabVideoFrame(v))
  }
  const onFile = (f: File | undefined) => { if (f) imageDataFromFile(f).then(runScan).catch(() => {}) }

  const cells: (ScanCell | null)[][] = result?.ok
    ? Array.from({ length: rot }, () => 0).reduce<ScanCell[][]>(g => rot90(g), result.cells)
    : []
  const flat = cells.flat()
  // result.center 与 result.cells[1][1].color 同源（见 pipeline.ts），直接用中心字段
  const centerColor = result?.ok ? result.center : null
  const mismatch = centerColor !== null && centerColor !== CENTERS[face]
  const complete = result?.ok === true && flat.every(c => c !== null)
  const name = (c: Color) => (locale === 'zh' ? COLOR_NAME[c] : c)

  const confirm = () => {
    if (!complete) return
    onConfirm(flat.map((c, i) => (i === 4 ? null : overrides[i] ?? c!.color)))
  }

  return (
    <div className="scanner-overlay" role="dialog">
      <div className="scanner-panel">
        <h2>{t.scan.title}</h2>
        <button className="scanner-close" aria-label={t.scan.cancel} onClick={onClose}>✕</button>
        {!result && (
          <div className="scanner-live">
            {!cameraDenied ? (
              <>
                {/* iOS 真机加固 #3：playsInline/muted/autoPlay 缺一不可 */}
                <video ref={videoRef} playsInline muted autoPlay data-testid="scan-video" />
                <div className="scanner-actions">
                  <button className="solve-link" onClick={onCapture}>{t.scan.capture}</button>
                  <label className="solve-link">
                    {t.scan.upload}
                    <input type="file" accept="image/*" data-testid="scan-file" hidden
                      onChange={e => onFile(e.target.files?.[0])} />
                  </label>
                </div>
              </>
            ) : (
              <p className="scan-warn" data-testid="scan-camera-denied">{t.scan.cameraDenied}</p>
            )}
            {cameraDenied && (
              <label className="solve-link">
                {t.scan.upload}
                <input type="file" accept="image/*" data-testid="scan-file" hidden
                  onChange={e => onFile(e.target.files?.[0])} />
              </label>
            )}
          </div>
        )}
        {result && !result.ok && (
          <div>
            <p className="scan-warn" data-testid="scan-error">{t.scan.notRecognized}</p>
            <div className="scanner-actions">
              <button className="solve-link" data-testid="scan-retake" onClick={() => setResult(null)}>{t.scan.retake}</button>
            </div>
          </div>
        )}
        {result?.ok && (
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
                    onClick={() => setFixing(i)} />
                )
              }))}
            </div>
            {fixing !== null && (
              <div className="scan-fix" data-testid="scan-fix">
                {COLOR_ORDER.map(col => (
                  <button key={col} className="chip" data-color={col}
                    style={{ background: COLOR_HEX[col] }}
                    onClick={() => { setOverrides(o => ({ ...o, [fixing]: col })); setFixing(null) }} />
                ))}
              </div>
            )}
            <div className="scanner-actions">
              <button className="solve-link" data-testid="scan-rotate" onClick={() => setRot(r => (r + 1) % 4)}>{t.scan.rotate}</button>
              <button className="solve-link" data-testid="scan-retake" onClick={() => setResult(null)}>{t.scan.retake}</button>
              <button className="solve-link" data-testid="scan-confirm" disabled={!complete} onClick={confirm}>{t.scan.confirm}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
