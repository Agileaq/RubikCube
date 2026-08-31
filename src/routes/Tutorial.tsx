import { Link } from 'react-router-dom'
import { TUTORIAL } from '../data/tutorial'
import { TutorialSection } from '../components/TutorialSection'

// The app uses HashRouter, so a plain `<a href="#anchor">` would replace the
// route hash and navigate to a nonexistent route instead of scrolling. Use a
// button that scrolls the section into view directly.
function jumpTo(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Tutorial() {
  return (
    <div className="app tutorial">
      <header className="tut-header">
        <Link to="/" className="back">‹ 返回</Link>
        <h1>三阶魔方教程</h1>
      </header>
      <nav className="tut-tabs">
        {TUTORIAL.map(s => (
          <button key={s.anchor} type="button" onClick={() => jumpTo(s.anchor)}>{s.tab}</button>
        ))}
      </nav>
      <div className="tut-body">
        {TUTORIAL.map(s => <TutorialSection key={s.anchor} section={s} />)}
      </div>
    </div>
  )
}
