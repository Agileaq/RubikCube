import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { Cube } from '../components/Cube'
import { Palette } from '../components/Palette'
import { FlipButton } from '../components/FlipButton'
import { BuildInfo } from '../components/BuildInfo'
import { FACES } from '../lib/cube'

export default function Paint() {
  const { cube, orientation, brush, remaining, paintSticker, setBrush, flip, reset, full, validation } = useApp()
  const [copied, setCopied] = useState(false)

  // Debug export: compact one-line encoding of the whole cube state, e.g.
  // "U:WWWWWWWWW|D:...|L:...|R:...|F:...|B:...". When the cube is unsolvable,
  // append the validator's specific failure reasons (duplicated/missing pieces,
  // impossible corners, twist/flip/parity) so a failing fill can be shared and
  // diagnosed exactly. The on-screen message stays short; the detail goes to
  // the clipboard.
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
        <span className="spacer" />
        <h1 className="title-fill">填色</h1>
        <Link to="/tutorial" className="book-btn" aria-label="教程">📖</Link>
      </header>

      <Cube cube={cube} orientation={orientation} onSticker={paintSticker} />

      <FlipButton onFlip={flip} />
      <p className="hint">请根据手上魔方各面颜色对图中魔方进行填色</p>

      <Palette remaining={remaining} brush={brush} onPick={setBrush} />

      {full && validation && !validation.solvable && (
        <>
          <p className="unsolvable">{validation.reason}</p>
          <button className="reset-btn" onClick={exportState}>
            {copied ? '已复制 ✓' : '导出填色状态(调试)'}
          </button>
        </>
      )}
      {full && validation?.solvable && (
        <Link to="/solve" className="solve-link">开始复原</Link>
      )}

      <button className="reset-btn" onClick={reset}>重置</button>
      <BuildInfo />
    </div>
  )
}

