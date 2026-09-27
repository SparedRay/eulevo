import { supabase } from './supabase'
import { MOCK } from '@/config'

/** Loaded only in mock mode, so production builds leave it out. */
const mock = () => import('./mock')

export interface GiftLink {
  label?: string
  url: string
}

export interface GuestGift {
  id: string
  title: string
  description: string | null
  room: string | null
  images: string[]
  links: GiftLink[]
  repeatable: boolean
  max_claims: number | null
  claim_count: number
  mine: boolean
}

export interface MyClaim {
  claim_id: string
  gift_id: string
  title: string
  images: string[]
  links: GiftLink[]
  repeatable: boolean
  claimed_at: string
  others: number
}

export interface GuestList {
  list: {
    id: string
    title: string
    event_at: string | null
    address: string | null
    theme: string
  }
  gifts: GuestGift[]
  mine: MyClaim[]
}

export type ClaimResult = 'ok' | 'taken' | 'already_yours' | 'not_found'

// ---------------------------------------------------------------------------
// Guests: RPCs only
// ---------------------------------------------------------------------------

export async function fetchGuestList(token: string): Promise<GuestList | null> {
  if (MOCK) return (await mock()).getList(token)
  const { data, error } = await supabase.rpc('get_list', { p_token: token })
  if (error) throw error
  return (data as GuestList | null) ?? null
}

export async function claimGift(
  giftId: string,
  opts: { lat?: number; lng?: number; device?: string } = {},
): Promise<ClaimResult> {
  if (MOCK) return (await mock()).claimGift(giftId, opts)
  const { data, error } = await supabase.rpc('claim_gift', {
    p_gift: giftId,
    p_lat: opts.lat ?? null,
    p_lng: opts.lng ?? null,
    p_device: opts.device ?? null,
  })
  if (error) throw error
  return data as ClaimResult
}

export async function releaseClaim(claimId: string): Promise<boolean> {
  if (MOCK) return (await mock()).releaseClaim(claimId)
  const { data, error } = await supabase.rpc('release_claim', { p_claim: claimId })
  if (error) throw error
  return data as boolean
}

/** Public URL for a photo stored in the gift-images bucket. */
export function imageUrl(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return supabase.storage.from('gift-images').getPublicUrl(path).data.publicUrl
}

// ---------------------------------------------------------------------------
// Hosts: tables, protected by RLS (is_list_admin)
// ---------------------------------------------------------------------------

export interface HostList {
  id: string
  title: string
  event_at: string | null
  address: string | null
  share_token: string
}

export interface NewList {
  title: string
  event_at: string | null
  address: string | null
}

export async function fetchHostLists(): Promise<HostList[]> {
  if (MOCK) return (await mock()).hostLists()
  const { data, error } = await supabase
    .from('lists')
    .select('id, title, event_at, address, share_token')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Creates a list and returns its id. */
export async function createList(input: NewList): Promise<string> {
  if (MOCK) return (await mock()).createList(input)
  const { data, error } = await supabase.from('lists').insert(input).select('id').single()
  if (error) throw error
  return data.id
}
