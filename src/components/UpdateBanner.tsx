import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n'

// Real-time PWA update banner. The service worker checks for new builds in the
// background; when one is ready, `needRefresh` flips true and this banner
// appears so the user can activate it with one tap instead of clearing cache.
export function UpdateBanner() {
  const { t } = useI18n()
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisterError() {
      // Swallow registration errors (e.g. unsupported browser) — the app still
      // works without a service worker; we just lose offline/update support.
    },
  })

  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>{t.update.newVersion}</span>
      <button onClick={() => updateServiceWorker()}>{t.update.updateNow}</button>
    </div>
  )
}
