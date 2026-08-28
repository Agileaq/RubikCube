export function BuildInfo() {
  const text = `v${__APP_VERSION__} · ${__GIT_SHA__} · ${__BUILD_TIME__}`
  return (
    <button className="build-info" onClick={() => navigator.clipboard?.writeText(text)}>{text}</button>
  )
}
