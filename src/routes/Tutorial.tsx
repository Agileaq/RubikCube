import { Link } from 'react-router-dom'
import { TUTORIAL } from '../data/tutorial'
import { TutorialSection } from '../components/TutorialSection'

export default function Tutorial() {
  return (
    <div className="app tutorial">
      <header className="tut-header">
        <Link to="/" className="back">‹ 返回</Link>
        <h1>三阶魔方教程</h1>
      </header>
      <nav className="tut-tabs">
        {TUTORIAL.map(s => <a key={s.anchor} href={`#${s.anchor}`}>{s.title.replace(/^[0-9.]+\s*/, '').slice(0,4)}</a>)}
      </nav>
      <div className="tut-body">
        {TUTORIAL.map(s => <TutorialSection key={s.anchor} section={s} />)}
      </div>
    </div>
  )
}
