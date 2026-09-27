/** A short, human description of the device, e.g. "iPhone" or "Android". No fingerprinting. */
export function deviceSummary(): string {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android'
  if (/Macintosh/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Other'
}

/**
 * Asks the browser for the position and rounds it to ~1 km.
 * Resolves to null if the guest says no, it times out, or geolocation is unavailable.
 *
 * `maxWaitMs` caps the whole wait, including time the browser's permission prompt sits
 * unanswered (the geolocation `timeout` option only starts after permission is given),
 * so a claim is never held up by an ignored prompt.
 */
export function roughLocation(timeoutMs = 8000, maxWaitMs = 12000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    let done = false
    const finish = (value: { lat: number; lng: number } | null) => {
      if (done) return
      done = true
      clearTimeout(guard)
      resolve(value)
    }
    const guard = setTimeout(() => finish(null), maxWaitMs)
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          finish({
            lat: Math.round(pos.coords.latitude * 100) / 100,
            lng: Math.round(pos.coords.longitude * 100) / 100,
          }),
        () => finish(null),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
      )
    } catch {
      finish(null)
    }
  })
}
