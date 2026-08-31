import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { useI18n } from '../i18n'
import { Cube } from '../components/Cube'
import { Palette } from '../components/Palette'
import { FlipButton } from '../components/FlipButton'
import { BuildInfo } from '../components/BuildInfo'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { FACES } from '../lib/cube'

export default function Paint() {
  const { cube, orientation, brush, remaining, paintSticker, setBrush, flip, reset, full, validation } = useApp()
  const { t } = useI18n()
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
        <h1 className="title-fill">{t.paint.title}</h1>
        <span className="header-actions">
          <LocaleSwitcher />
          <Link to="/tutorial" className="book-btn" aria-label={t.paint.tutorialAria}>📖</Link>
        </span>
      </header>

      <Cube cube={cube} orientation={orientation} onSticker={paintSticker} />

      <FlipButton onFlip={flip} />
      <p className="hint">{t.paint.hint}</p>

      <Palette remaining={remaining} brush={brush} onPick={setBrush} />

      {full && validation && !validation.solvable && (
        <>
          <p className="unsolvable">{t.paint.unsolvable}</p>
          <button className="reset-btn" onClick={exportState}>
            {copied ? t.paint.copied : t.paint.export}
          </button>
        </>
      )}
      {full && validation?.solvable && (
        <Link to="/solve" className="solve-link">{t.paint.startSolve}</Link>
      )}

      <button className="reset-btn" onClick={reset}>{t.paint.reset}</button>
      <BuildInfo />
    </div>
  )
}

