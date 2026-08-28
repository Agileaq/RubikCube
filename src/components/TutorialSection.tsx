import type { TutorialSection as TS } from '../types'

export function TutorialSection({ section }: { section: TS }) {
  return (
    <section id={section.anchor} className="tut-section">
      <h2>{section.title}</h2>
      <p>{section.body}</p>
      {section.algs.length > 0 && (
        <div className="alg-row">{section.algs.map((a, i) => <code key={i}>{a}</code>)}</div>
      )}
    </section>
  )
}
