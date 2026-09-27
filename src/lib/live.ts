import { supabase } from './supabase'
import { MOCK } from '@/config'

/** Backup refresh in case the live connection drops (phones pause it in the background). */
const POLL_MS = 30_000
/** Several changes in a burst (e.g. a list deleted with its gifts) become one refresh. */
const DEBOUNCE_MS = 300

/**
 * Keeps a screen showing list `listId` up to date: refreshes when the database says the list changed
 * (Realtime broadcast from the live_updates migration), when the person comes back to the tab or app,
 * and every 30 s as a backup. Returns a function that stops all of it.
 */
export function watchList(listId: string, refresh: () => unknown): () => void {
  let debounce: ReturnType<typeof setTimeout> | undefined
  const soon = () => {
    clearTimeout(debounce)
    debounce = setTimeout(refresh, DEBOUNCE_MS)
  }

  const onVisible = () => document.visibilityState === 'visible' && soon()
  document.addEventListener('visibilitychange', onVisible)
  const poll = setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS)

  let stopChannel = () => {}
  if (MOCK) {
    import('./mock').then((m) => (stopChannel = m.onListChanged(listId, soon)))
  } else {
    const channel = supabase.channel(`list:${listId}`).on('broadcast', { event: 'changed' }, soon).subscribe()
    stopChannel = () => void supabase.removeChannel(channel)
  }

  return () => {
    clearTimeout(debounce)
    clearInterval(poll)
    document.removeEventListener('visibilitychange', onVisible)
    stopChannel()
  }
}
