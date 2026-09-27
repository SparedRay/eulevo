import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ensureGuestSession } from '@/lib/supabase'
import {
  fetchGuestList,
  claimGift,
  releaseClaim,
  type GuestList,
  type ClaimResult,
} from '@/lib/api'
import { deviceSummary, roughLocation } from '@/lib/device'
import { rememberList } from '@/lib/lastList'
import { watchList } from '@/lib/live'

export const useGuestStore = defineStore('guest', () => {
  const token = ref<string | null>(null)
  const data = ref<GuestList | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)

  const list = computed(() => data.value?.list ?? null)
  const mine = computed(() => data.value?.mine ?? [])
  /** Gifts still open to this guest (their own claims are shown in "What you're bringing"). */
  const openGifts = computed(() => (data.value?.gifts ?? []).filter((g) => !g.mine))

  function giftById(id: string) {
    return data.value?.gifts.find((g) => g.id === id) ?? null
  }

  async function load(t: string, { quiet = false } = {}) {
    token.value = t
    if (!quiet) {
      loading.value = true
      error.value = null
    }
    try {
      await ensureGuestSession()
      const res = await fetchGuestList(t)
      notFound.value = res === null
      data.value = res
      if (res) rememberList({ token: t, title: res.list.title })
      syncLive()
    } catch (e) {
      // A failed background refresh keeps what's on screen; the next one will try again.
      if (!quiet) error.value = 'Não conseguimos carregar a lista. Confira sua internet e tente de novo.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  // Live updates, shared by the guest screens that show the list (list, confirm, mine): each calls
  // startLive() when it opens and stopLive() when it closes, so moving between them keeps one connection.
  let liveUsers = 0
  let watching: { listId: string; stop: () => void } | null = null

  /** (Re)connects to the loaded list while any screen needs it. */
  function syncLive() {
    const listId = liveUsers > 0 ? (data.value?.list.id ?? null) : null
    if (watching?.listId === listId) return
    watching?.stop()
    watching = listId
      ? { listId, stop: watchList(listId, () => token.value && load(token.value, { quiet: true })) }
      : null
  }

  /** Keeps the list fresh so gifts others choose disappear right away, even on the confirm screen. */
  function startLive() {
    liveUsers++
    syncLive()
  }

  function stopLive() {
    liveUsers = Math.max(0, liveUsers - 1)
    // Let the next screen's startLive() run first, so switching screens doesn't reconnect.
    setTimeout(syncLive)
  }

  async function claim(giftId: string, shareLocation: boolean): Promise<ClaimResult> {
    const loc = shareLocation ? await roughLocation() : null
    const result = await claimGift(giftId, {
      lat: loc?.lat,
      lng: loc?.lng,
      device: deviceSummary(),
    })
    if (token.value) await load(token.value, { quiet: true })
    return result
  }

  async function release(claimId: string) {
    await releaseClaim(claimId)
    if (token.value) await load(token.value, { quiet: true })
  }

  return {
    token,
    data,
    list,
    mine,
    openGifts,
    loading,
    error,
    notFound,
    giftById,
    load,
    startLive,
    stopLive,
    claim,
    release,
  }
})
