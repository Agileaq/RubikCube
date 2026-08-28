import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Color, CubeState, Face, Orientation } from '../types'
import { cloneCube, isFull, remainingCounts } from '../lib/cube'
import { loadPaint, savePaint, clearPaint, ensureSchema } from '../lib/storage'
import { emptyCube } from '../lib/cube'
import { validate } from '../lib/solvability'

export interface AppValue {
  cube: CubeState; brush: Color; orientation: Orientation
  remaining: Record<Color, number>; full: boolean
  validation: { solvable: boolean; reason?: string } | null
  setBrush(c: Color): void
  paintSticker(face: Face, index: number): void
  flip(): void
  reset(): void
}

export const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [cube, setCube] = useState<CubeState>(() => { ensureSchema(); return loadPaint() })
  const [brush, setBrush] = useState<Color>('W')
  const [orientation, setOrientation] = useState<Orientation>('default')

  useEffect(() => { savePaint(cube) }, [cube])

  const remaining = useMemo(() => remainingCounts(cube), [cube])
  const full = useMemo(() => isFull(cube), [cube])
  const validation = useMemo(() => (full ? validate(cube) : null), [cube, full])

  const value: AppValue = {
    cube, brush, orientation, remaining, full, validation,
    setBrush,
    paintSticker(face, index) {
      if (index === 4) return
      setCube(prev => { const next = cloneCube(prev); next[face][index] = brush; return next })
    },
    flip() { setOrientation(o => (o === 'default' ? 'flipped' : 'default')) },
    reset() { clearPaint(); setCube(emptyCube()); setOrientation('default') },
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
