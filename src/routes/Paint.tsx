import { Link } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { useI18n } from '../i18n'
import { Cube } from '../components/Cube'
import { Palette } from '../components/Palette'
import { FlipButton } from '../components/FlipButton'
import { BuildInfo } from '../components/BuildInfo'
import { LocaleSwitcher } from '../components/LocaleSwitcher'

export default function Paint() {
  const { cube, orientation, brush, remaining, paintSticker, setBrush, flip, reset, full, validation } = useApp()
  const { t } = useI18n()

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
        <p className="unsolvable">{t.paint.unsolvable}</p>
      )}
      {full && validation?.solvable && (
        <div className="solve-links">
          <Link to="/solve" className="solve-link">{t.paint.teachSolve}</Link>
          <Link to="/solve/fast" className="solve-link">{t.paint.kociembaSolve}</Link>
        </div>
      )}

      <button className="reset-btn" onClick={reset}>{t.paint.reset}</button>
      <BuildInfo />
    </div>
  )
}

