/**
 * Keeping an open app current after a deploy, without ever interrupting someone mid-task.
 *
 * - Every few minutes, and when the app comes back into view, compare this build with /version.json.
 *   If a newer one is deployed, `updateReady` flips and the router swaps it in at the next change of screen
 *   (a full load of that screen instead of the in-app move). Nothing reloads while someone is typing.
 * - A deploy replaces the hashed code files, so an old app asking for a screen it never downloaded gets a
 *   missing file. `isMissingCodeError()` spots that, and the router loads the screen fresh instead.
 *
 * Production only: the dev server has no version.json and serves code as it's edited.
 */
const CHECK_EVERY_MS = 5 * 60_000

export let updateReady = false

async function checkForUpdate() {
  if (updateReady || document.visibilityState !== 'visible') return
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    if (!res.ok) return
    const { build } = (await res.json()) as { build?: string }
    if (build && build !== __BUILD_ID__) updateReady = true
  } catch {
    // Offline: try again later.
  }
}

export function watchForUpdates() {
  if (!import.meta.env.PROD) return
  setInterval(checkForUpdate, CHECK_EVERY_MS)
  document.addEventListener('visibilitychange', checkForUpdate)
  // Back/forward can bring back an old page, old code and all, straight from the browser's memory.
  window.addEventListener('pageshow', (e) => e.persisted && checkForUpdate())
}

/** The error a dynamic import throws when its file is gone (wording differs per browser). */
export function isMissingCodeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|module script failed|valid JavaScript MIME type|Loading chunk|Unable to preload CSS/i.test(message)
}

const RELOAD_KEY = 'eulevo-reloaded-for'

/**
 * Full load of `href` (the new version of that screen). Refuses to do it again for the same address within
 * 10 s unless a screen has loaded fine in between, so a real outage can't turn into a reload loop.
 */
export function loadFresh(href: string): boolean {
  try {
    const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) ?? 'null')
    if (last?.href === href && Date.now() - last.at < 10_000) return false
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ href, at: Date.now() }))
  } catch {
    // no storage: still reload, just without the loop guard
  }
  window.location.assign(href)
  return true
}

/** A screen loaded fine: whatever fresh load came before it worked, so the loop guard can reset. */
export function screenLoaded() {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    // nothing stored
  }
}
