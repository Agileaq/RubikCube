import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../i18n'

// Real-time PWA update banner.
//
// Two independent detection paths, because no single one works everywhere:
//
// 1. SW-event path (Chrome etc.): vite-plugin-pwa's useRegisterSW fires
//    needRefresh when a new SW is waiting. We re-verify a worker is genuinely
//    waiting/installing (kills the external-SW false positive that sticks the
//    banner on GitHub Pages).
//
// 2. Version-stamp path (iOS standalone PWA): iOS "Add to Home Screen" apps
//    NEVER reliably fire SW updatefound/waiting events — they don't poll for
//    SW updates the way Chrome does, so needRefresh stays false forever and
//    Chrome-only banners never show on iOS. So we also fetch /RubikCube/
//    version.json (written fresh each build, NOT in the SW precache list)
//    with cache:'no-store' and compare builtAt to the build this page was
//    served from (__BUILD_TIME__). A mismatch means a newer build shipped →
//    show the banner. Reload picks up the new bundle + new SW.
//
// Either signal shows the banner; clicking always reloads (resolves both).
// __BUILD_TIME__ is a global define (see vite.config.ts + vite-env.d.ts),
// the timestamp of the bundle this page was served from.

const VERSION_URL = '/RubikCube/version.json'
// Poll every 10 min; also check once shortly after load (covers the common
// "deploy then user reopens the installed app" case on iOS, where the app
// resumes from a frozen state and wouldn't otherwise notice for a long time).
const POLL_MS = 10 * 60 * 1000

export function UpdateBanner() {
  const { t } = useI18n()
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisterError() {
      // Swallow registration errors (e.g. unsupported browser) — the app still
      // works without a service worker; we just lose offline/update support.
    },
  })

  const [swWaiting, setSwWaiting] = useState(false)
  const [versionChanged, setVersionChanged] = useState(false)

  // needRefresh is [bool, setter] from the plugin; pull the bool out so the
  // effect dep is a stable primitive, not a fresh tuple each render.
  const refreshFlagged = needRefresh[0]

  // Path 1: SW-event. Re-check against the actual registration: only treat as
  // a real update when a worker is genuinely waiting/installing. This kills
  // the external-SW false positive.
  useEffect(() => {
    if (!refreshFlagged) { setSwWaiting(false); return }
    let active = true
    navigator.serviceWorker?.getRegistration('/RubikCube/').then((reg) => {
      if (!active) return
      setSwWaiting(!!(reg?.waiting || reg?.installing))
    }).catch(() => { if (active) setSwWaiting(false) })
    return () => { active = false }
  }, [refreshFlagged])

  // Path 2: version-stamp poll. Fetch version.json bypassing all caches;
  // compare builtAt to this build's __BUILD_TIME__. Mismatch → new deploy.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function check() {
      try {
        const res = await fetch(VERSION_URL, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as { builtAt?: string }
        if (data.builtAt && data.builtAt !== __BUILD_TIME__) setVersionChanged(true)
      } catch {
        /* network/SW unavailable — silent */
      }
    }
    // Initial check after a short delay (let the page settle), then poll.
    timer = setTimeout(check, 5000)
    const interval = setInterval(check, POLL_MS)
    return () => { cancelled = true; clearTimeout(timer); clearInterval(interval); void cancelled }
  }, [])

  function handleUpdate() {
    // Path 1: tell a waiting SW to skip waiting (no-op if none). Path 2 just
    // needs a reload to pick up the new bundle. Either way, force a reload so
    // the banner resolves and the new build + SW take over.
    try { updateServiceWorker(true) } catch { /* no SW — ignore */ }
    setTimeout(() => window.location.reload(), 300)
  }

  if (!swWaiting && !versionChanged) return null
  return (
    <div className="update-banner" role="status">
      <span>{t.update.newVersion}</span>
      <button onClick={handleUpdate}>{t.update.updateNow}</button>
    </div>
  )
}
