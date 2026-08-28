import { HashRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div className="app">填色</div>} />
      </Routes>
    </HashRouter>
  )
}
