import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Dict, Locale } from './types'
import { LOCALES } from './types'
import { zh } from './zh'
import { en } from './en'
import { fr } from './fr'
import { es } from './es'
import { ru } from './ru'
import { ar } from './ar'

export { LOCALES }
export type { Dict, Locale }

const DICTS: Record<Locale, Dict> = { zh, en, fr, es, ru, ar }

const KEY = 'rc.locale'

function loadLocale(): Locale {
  try {
    const v = localStorage.getItem(KEY) as Locale | null
    if (v && DICTS[v]) return v
  } catch {
    /* storage unavailable */
  }
  return 'zh'
}

export interface I18nValue {
  locale: Locale
  setLocale(l: Locale): void
  t: Dict
}

export const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(loadLocale)

  // Persist the choice and flip document direction for RTL locales (Arabic).
  useEffect(() => {
    try {
      localStorage.setItem(KEY, locale)
    } catch {
      /* storage unavailable */
    }
    const meta = LOCALES.find(m => m.locale === locale)
    document.documentElement.dir = meta?.rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: DICTS[locale] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext)
  if (!v) throw new Error('useI18n must be used within I18nProvider')
  return v
}
