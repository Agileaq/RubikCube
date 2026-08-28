import { HashRouter, Routes, Route } from 'react-router-dom'
import Paint from './routes/Paint'
import Solve from './routes/Solve'
import Tutorial from './routes/Tutorial'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Paint />} />
        <Route path="/solve" element={<Solve />} />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
    </HashRouter>
  )
}
