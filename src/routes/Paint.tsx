import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { useI18n } from '../i18n'
import { Cube } from '../components/Cube'
import { Palette } from '../components/Palette'
import { FlipButton } from '../components/FlipButton'
import { BuildInfo } from '../components/BuildInfo'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { ScannerOverlay } from '../components/ScannerOverlay'
import { FACES } from '../lib/cube'

// 扫描取景框图标（拍照填色按钮左侧）
function ScanIcon() {
  return (
    <svg className="scan-icon" width="20" height="19" viewBox="0 0 460 440" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="27">
        <path d="M81.5 195V83.5H192" />
        <path d="M382.5 195V83.5H272" />
        <path d="M81.5 258v110.5H192" />
        <path d="M382.5 258v110.5H272" />
      </g>
      <path d="M68 227.5h328" stroke="currentColor" strokeWidth="25" />
      <text x="232" y="271" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="33" fontWeight="bold" textLength="74" lengthAdjust="spacingAndGlyphs" fill="currentColor">SCAN</text>
    </svg>
  )
}

export default function Paint() {
  const { cube, orientation, brush, remaining, paintSticker, setBrush, flip, reset, full, validation } = useApp()
  const { t } = useI18n()
  const [scanning, setScanning] = useState(false)
  const [copied, setCopied] = useState(false)

  // 调试导出：整仓一行编码 "U:WWWWWWWWW|D:...|..."；不可解时附校验器的具体原因
  // （重复/缺失块、角块不可能、扭转/翻棱/奇偶），便于把失败状态原样发出去定位。
  function exportState() {
    const code = FACES.map(f => `${f}:${cube[f].map(x => x ?? '_').join('')}`).join('|')
    const detail = validation?.solvable === false && validation.detail ? `\n---\n${validation.detail}` : ''
    navigator.clipboard?.writeText(code + detail).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000) },
      () => { /* clipboard unavailable */ },
    )
  }

  return (
    <div className="app paint">
      <header className="paint-header">
        <span className="header-actions">
          <LocaleSwitcher />
        </span>
        <h1 className="title-fill">{t.paint.title}</h1>
        <span className="header-actions">
          <Link to="/tutorial" className="book-btn" aria-label={t.paint.tutorialAria}>📖</Link>
        </span>
      </header>

      <Cube cube={cube} orientation={orientation} onSticker={paintSticker} />

      <FlipButton onFlip={flip} />
      <p className="hint">{t.paint.hint}</p>

      <Palette remaining={remaining} brush={brush} onPick={setBrush} />

      <div className="paint-buttons">
        <button className="reset-btn" onClick={() => setScanning(true)}>
          <ScanIcon />
          {t.scan.open}
        </button>
        <button className="reset-btn" onClick={reset}>{t.paint.reset}</button>
      </div>
      {scanning && <ScannerOverlay onClose={() => setScanning(false)} />}

      {full && validation && !validation.solvable && (
        <p className="unsolvable">{t.paint.unsolvable}</p>
      )}
      {full && (
        <button className="reset-btn" onClick={exportState}>
          {copied ? t.paint.copied : t.paint.export}
        </button>
      )}
      {full && validation?.solvable && (
        <div className="solve-links">
          <Link to="/solve" className="solve-link">{t.paint.teachSolve}</Link>
          <Link to="/solve/fast" className="solve-link">{t.paint.kociembaSolve}</Link>
        </div>
      )}

      <BuildInfo />
    </div>
  )
}

