import { Link } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { Cube } from '../components/Cube'
import { Palette } from '../components/Palette'
import { FlipButton } from '../components/FlipButton'
import { BuildInfo } from '../components/BuildInfo'

export default function Paint() {
  const { cube, orientation, brush, remaining, paintSticker, setBrush, flip, reset, full, validation } = useApp()
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
        <p className="unsolvable">{validation.reason}</p>
      )}
      {full && validation?.solvable && (
        <Link to="/solve" className="solve-link">开始复原</Link>
      )}

      <button className="reset-btn" onClick={reset}>重置</button>
      <BuildInfo />
    </div>
  )
}
