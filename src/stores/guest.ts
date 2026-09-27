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

const REFRESH_MS = 20_000

export const useGuestStore = defineStore('guest', () => {
  const token = ref<string | null>(null)
  const data = ref<GuestList | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined

  const list = computed(() => data.value?.list ?? null)
  const mine = computed(() => data.value?.mine ?? [])
  /** Gifts still open to this guest (their own claims are shown in "What you're bringing"). */
  const openGifts = computed(() => (data.value?.gifts ?? []).filter((g) => !g.mine))

  function giftById(id: string) {
    return data.value?.gifts.find((g) => g.id === id) ?? null
  }

  async function load(t: string, { quiet = false } = {}) {
    token.value = t
    if (!quiet) loading.value = true
    error.value = null
    try {
      await ensureGuestSession()
      const res = await fetchGuestList(t)
      notFound.value = res === null
      data.value = res
    } catch (e) {
      error.value = 'Não conseguimos carregar a lista. Confira sua internet e tente de novo.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  /** Keeps the list fresh so gifts taken by others disappear without reloading. */
  function startAutoRefresh() {
    stopAutoRefresh()
    timer = setInterval(() => {
      if (token.value && document.visibilityState === 'visible') load(token.value, { quiet: true })
    }, REFRESH_MS)
  }

  function stopAutoRefresh() {
    if (timer) clearInterval(timer)
    timer = undefined
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
    startAutoRefresh,
    stopAutoRefresh,
    claim,
    release,
  }
})
