import { LOCALES, useI18n } from '../i18n'

// Single-button language switcher: one tap advances to the next locale and
// wraps around (zh → en → fr → es → ru → ar → zh…). Default locale is zh (the
// first entry in LOCALES), matching the I18nProvider's loadLocale fallback.
// The button shows the CURRENT locale's flag; hover title shows the name.
export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n()
  const current = LOCALES.find(m => m.locale === locale) ?? LOCALES[0]
  function next() {
    const idx = LOCALES.findIndex(m => m.locale === locale)
    const nextIdx = (idx + 1) % LOCALES.length
    setLocale(LOCALES[nextIdx].locale)
  }
  return (
    <button
      type="button"
      className={'flag active'}
      title={current.name}
      aria-label={current.name}
      onClick={next}
    >
      {current.flag}
    </button>
  )
}
