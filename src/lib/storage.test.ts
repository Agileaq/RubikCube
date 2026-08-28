import { describe, it, expect, beforeEach } from 'vitest'
import { loadPaint, savePaint, clearPaint } from './storage'
import { emptyCube, solvedCube } from './cube'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('loads empty cube when nothing saved', () => {
    expect(loadPaint()).toEqual(emptyCube())
  })

  it('round-trips a saved cube', () => {
    const c = solvedCube(); c.U[0] = null
    savePaint(c)
    expect(loadPaint()).toEqual(c)
  })

  it('clearPaint resets to empty', () => {
    savePaint(solvedCube()); clearPaint()
    expect(loadPaint()).toEqual(emptyCube())
  })

  it('malformed blob falls back to empty', () => {
    localStorage.setItem('rc.paint', '{not json')
    expect(loadPaint()).toEqual(emptyCube())
  })
})
