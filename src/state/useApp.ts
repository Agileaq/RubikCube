import { useContext } from 'react'
import { AppContext } from './AppContext'

export function useApp() {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp must be used within AppProvider')
  return v
}
