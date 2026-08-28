import type { CubeState } from '../types'
import { emptyCube } from './cube'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

const K = { paint: 'rc.paint', schemaVersion: 'rc.schemaVersion' } as const

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw == null) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export function loadPaint(): CubeState {
  const c = read<CubeState | null>(K.paint, null)
  if (!c) return emptyCube()
  // shallow shape check: 6 faces each length 9
  const faces = ['U','D','L','R','F','B'] as const
  if (!faces.every(f => Array.isArray(c[f]) && c[f].length === 9)) return emptyCube()
  return c
}
export function savePaint(c: CubeState): void { localStorage.setItem(K.paint, JSON.stringify(c)) }
export function clearPaint(): void { localStorage.removeItem(K.paint) }

export function ensureSchema(): void {
  const stored = Number(localStorage.getItem(K.schemaVersion) ?? CURRENT_SCHEMA_VERSION)
  const raw = localStorage.getItem(K.paint)
  if (raw != null) {
    try {
      const migrated = migrate({ version: stored, data: JSON.parse(raw) })
      localStorage.setItem(K.paint, JSON.stringify(migrated.data))
    } catch { /* leave malformed; loadPaint falls back */ }
  }
  localStorage.setItem(K.schemaVersion, String(CURRENT_SCHEMA_VERSION))
}
