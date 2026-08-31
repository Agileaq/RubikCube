import { Link } from 'react-router-dom'
import { TUTORIAL } from '../data/tutorial'
import { TutorialSection } from '../components/TutorialSection'
import { LocaleSwitcher } from '../components/LocaleSwitcher'
import { useI18n } from '../i18n'

export default function Tutorial() {
  const { t } = useI18n()
  // Merge localized tab/title/body with the language-neutral move algs.
  const sections = t.tutorial.sections.map((s, i) => ({
    anchor: s.anchor,
    tab: s.tab,
    title: s.title,
    body: s.body,
    algs: TUTORIAL[i]?.algs ?? [],
  }))
  return (
    <div className="app tutorial">
      <header className="tut-header">
        <Link to="/" className="back">{t.tutorial.back}</Link>
        <h1>{t.tutorial.title}</h1>
        <span className="tut-header-spacer" />
        <LocaleSwitcher />
      </header>
      <nav className="tut-tabs">
        {sections.map(s => (
          <button key={s.anchor} type="button" onClick={() => document.getElementById(s.anchor)?.scrollIntoView({ behavior: 'smooth' })}>
            {s.tab}
          </button>
        ))}
      </nav>
      <div className="tut-body">
        {sections.map(s => <TutorialSection key={s.anchor} section={s} />)}
      </div>
    </div>
  )
}
