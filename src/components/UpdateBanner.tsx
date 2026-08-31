import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n'

// Real-time PWA update banner.
//
// Root cause this guards against (systematic-debugging Phase 1):
// vite-plugin-pwa's `useRegisterSW` fires `needRefresh=true` on BOTH a genuine
// waiting update AND an *external* service-worker `installed` event
// (event.isExternal — e.g. a leftover/outdated SW from a previous deploy or a
// different app on the same origin). On GitHub Pages this external path is
// common and produces a false "发现新版本" banner with no real new SW to skip.
// Worse, clicking 立即更新 only reloads when the `controlling` event has
// isUpdate=true; for an external SW isUpdate is false, so nothing reloads and
// the banner sticks — the exact bug reported ("点击立即更新 banner 还在").
//
// Fix: gate the banner on a genuinely-waiting SW (navigator.serviceWorker.
// getRegistration().waiting), and on click always do skipWaiting + a bounded
// reload fallback (so the banner can never get stuck even if the controlling
// event never fires). We still use the plugin's SW/registration plumbing; we
// just stop trusting its needRefresh flag blindly.
export function UpdateBanner() {
  const { t } = useI18n()
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisterError() {
      // Swallow registration errors (e.g. unsupported browser) — the app still
      // works without a service worker; we just lose offline/update support.
    },
  })

  // needRefresh is [bool, setter] from the plugin; pull the bool out so the
  // effect dep is a stable primitive, not a fresh tuple each render.
  const refreshFlagged = needRefresh[0]
  const [confirmed, setConfirmed] = useState(false) // real update verified

  // The plugin fires needRefresh on both genuine waiting updates AND external
  // SW `installed` events. Re-check against the actual registration: only show
  // the banner when a worker is genuinely waiting/installing. This kills the
  // external-SW false positive.
  useEffect(() => {
    if (!refreshFlagged) { setConfirmed(false); return }
    let active = true
    navigator.serviceWorker?.getRegistration('/RubikCube/').then((reg) => {
      if (!active) return
      const waiting = reg?.waiting || reg?.installing
      setConfirmed(!!waiting)
    }).catch(() => { if (active) setConfirmed(false) })
    return () => { active = false }
  }, [refreshFlagged])

  function handleUpdate() {
    // Tell the waiting SW to skip waiting (plugin's helper messages it), then
    // force a reload after a short window to let it take control. Bounded by
    // a timeout so we ALWAYS reload — the banner can never get stuck even if
    // the `controlling` event with isUpdate=true never fires (external SW case).
    updateServiceWorker(true)
    setTimeout(() => window.location.reload(), 800)
  }

  if (!confirmed) return null
  return (
    <div className="update-banner" role="status">
      <span>{t.update.newVersion}</span>
      <button onClick={handleUpdate}>{t.update.updateNow}</button>
    </div>
  )
}
