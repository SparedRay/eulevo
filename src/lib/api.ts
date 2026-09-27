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

export async function fetchHostList(id: string): Promise<HostList | null> {
  if (MOCK) return (await mock()).hostList(id)
  const { data, error } = await supabase
    .from('lists')
    .select('id, title, event_at, address, share_token')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** A gift as the hosts see it: every column, plus how many guests are bringing it right now. */
export interface HostGift {
  id: string
  list_id: string
  title: string
  description: string | null
  room: string | null
  images: string[]
  links: GiftLink[]
  repeatable: boolean
  max_claims: number | null
  sort: number
  archived: boolean
  created_at: string
  claim_count: number
}

export type GiftInput = Pick<HostGift, 'title' | 'description' | 'images' | 'links' | 'repeatable' | 'max_claims'>

/** All gifts of a list, archived ones included, in guest order. */
export async function fetchHostGifts(listId: string): Promise<HostGift[]> {
  if (MOCK) return (await mock()).hostGifts(listId)
  const [gifts, claims] = await Promise.all([
    supabase
      .from('gifts')
      .select('id, list_id, title, description, room, images, links, repeatable, max_claims, sort, archived, created_at')
      .eq('list_id', listId)
      .order('sort')
      .order('created_at'),
    supabase.from('claims').select('gift_id').eq('list_id', listId).is('released_at', null),
  ])
  if (gifts.error) throw gifts.error
  if (claims.error) throw claims.error
  const counts = new Map<string, number>()
  for (const c of claims.data ?? []) counts.set(c.gift_id, (counts.get(c.gift_id) ?? 0) + 1)
  return (gifts.data ?? []).map((g) => ({ ...g, claim_count: counts.get(g.id) ?? 0 }))
}

export async function createGift(listId: string, input: GiftInput): Promise<void> {
  if (MOCK) return (await mock()).createGift(listId, input)
  const { error } = await supabase.from('gifts').insert({ ...input, list_id: listId })
  if (error) throw error
}

export async function updateGift(id: string, input: GiftInput): Promise<void> {
  if (MOCK) return (await mock()).updateGift(id, input)
  const { error } = await supabase.from('gifts').update(input).eq('id', id)
  if (error) throw error
}

/** Archived gifts disappear from the guest list; guests who already claimed one still see it under "mine". */
export async function setGiftArchived(id: string, archived: boolean): Promise<void> {
  if (MOCK) return (await mock()).setGiftArchived(id, archived)
  const { error } = await supabase.from('gifts').update({ archived }).eq('id', id)
  if (error) throw error
}

/** Uploads an already-shrunk photo to gift-images/<list_id>/<uuid>.<ext> and returns its storage path. */
export async function uploadGiftPhoto(listId: string, photo: Blob): Promise<string> {
  if (MOCK) return (await mock()).uploadGiftPhoto(photo)
  const ext = photo.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${listId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('gift-images')
    .upload(path, photo, { contentType: photo.type, cacheControl: '31536000' })
  if (error) throw error
  return path
}
