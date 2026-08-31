import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Paint from './routes/Paint'
import Tutorial from './routes/Tutorial'
import { UpdateBanner } from './components/UpdateBanner'
import { useI18n } from './i18n'

// Lazy-load the solve route so the heavy solver module (built eagerly at import
// time) lands in its own chunk and never weighs down the paint screen's load.
const Solve = lazy(() => import('./routes/Solve'))

export default function App() {
  const { t } = useI18n()
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Paint />} />
        <Route
          path="/solve"
          element={
            <Suspense fallback={<div className="app">{t.solve.preparing}</div>}>
              <Solve />
            </Suspense>
          }
        />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
      <UpdateBanner />
    </HashRouter>
  )
}
