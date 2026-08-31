import { LOCALES, useI18n } from '../i18n'

// Flag-based language switcher. Rendered in the paint header next to the
// tutorial button; each flag switches the whole app locale (persisted, RTL-aware).
export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n()
  return (
    <div className="locale-switcher" role="group" aria-label="Language">
      {LOCALES.map(m => (
        <button
          key={m.locale}
          type="button"
          title={m.name}
          aria-label={m.name}
          className={'flag' + (m.locale === locale ? ' active' : '')}
          onClick={() => setLocale(m.locale)}
        >
          {m.flag}
        </button>
      ))}
    </div>
  )
}
