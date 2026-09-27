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

/** Photos that live in the gift-images bucket (not links or in-memory data URLs). */
const isStoragePath = (path: string) => !/^(https?:|data:|blob:)/.test(path)

/** Public URL for a photo stored in the gift-images bucket. */
export function imageUrl(path: string): string {
  if (!isStoragePath(path)) return path
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

/** An active claim as the hosts see it. Guests stay anonymous: only a short tag of their device id. */
export interface HostClaim {
  id: string
  gift_id: string
  gift_title: string
  repeatable: boolean
  claimed_at: string
  device_summary: string | null
  /** First 4 characters of the guest's anonymous id: the same tag means the same phone. */
  device_tag: string
  lat: number | null
  lng: number | null
  area_label: string | null
}

export const deviceTag = (deviceId: string) => deviceId.replace(/-/g, '').slice(0, 4)

/** Active (not released) claims of a list, newest first. */
export async function fetchHostClaims(listId: string): Promise<HostClaim[]> {
  if (MOCK) return (await mock()).hostClaims(listId)
  const { data, error } = await supabase
    .from('claims')
    .select('id, gift_id, claimed_at, device_id, device_summary, lat_rounded, lng_rounded, area_label, gifts(title, repeatable)')
    .eq('list_id', listId)
    .is('released_at', null)
    .order('claimed_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((c) => {
    const gift = c.gifts as unknown as { title: string; repeatable: boolean } | null
    return {
      id: c.id,
      gift_id: c.gift_id,
      gift_title: gift?.title ?? '',
      repeatable: gift?.repeatable ?? false,
      claimed_at: c.claimed_at,
      device_summary: c.device_summary,
      device_tag: deviceTag(c.device_id),
      lat: c.lat_rounded === null ? null : Number(c.lat_rounded),
      lng: c.lng_rounded === null ? null : Number(c.lng_rounded),
      area_label: c.area_label,
    }
  })
}

// ---------------------------------------------------------------------------
// Party details and co-hosts
// ---------------------------------------------------------------------------

/** Hosts may change title, date and address; guests see the change on their next refresh. */
export async function updateList(id: string, input: NewList): Promise<void> {
  if (MOCK) return (await mock()).updateList(id, input)
  const { error } = await supabase.from('lists').update(input).eq('id', id)
  if (error) throw error
}

export interface ListHost {
  user_id: string
  email: string
  is_owner: boolean
  is_me: boolean
}

/** Everyone who manages the list, owner first. */
export async function fetchListHosts(listId: string): Promise<ListHost[]> {
  if (MOCK) return (await mock()).listHosts(listId)
  const { data, error } = await supabase.rpc('list_hosts', { p_list: listId })
  if (error) throw error
  return (data as ListHost[] | null) ?? []
}

/** Only the owner can remove co-hosts (RLS "owner manages co-hosts"). */
export async function removeCoHost(listId: string, userId: string): Promise<void> {
  if (MOCK) return (await mock()).removeCoHost(listId, userId)
  const { error } = await supabase.from('list_admins').delete().eq('list_id', listId).eq('user_id', userId)
  if (error) throw error
}

export interface Invite {
  token: string
  created_at: string
  expires_at: string
}

/** Invites that can still be used. Only the owner can see them. */
export async function fetchOpenInvites(listId: string): Promise<Invite[]> {
  if (MOCK) return (await mock()).openInvites(listId)
  const { data, error } = await supabase
    .from('list_invites')
    .select('token, created_at, expires_at')
    .eq('list_id', listId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createInvite(listId: string): Promise<Invite> {
  if (MOCK) return (await mock()).createInvite(listId)
  const { data, error } = await supabase
    .from('list_invites')
    .insert({ list_id: listId })
    .select('token, created_at, expires_at')
    .single()
  if (error) throw error
  return data
}

export async function cancelInvite(token: string): Promise<void> {
  if (MOCK) return (await mock()).cancelInvite(token)
  const { error } = await supabase.from('list_invites').delete().eq('token', token)
  if (error) throw error
}

export type InviteStatus = 'ok' | 'already_host' | 'used' | 'expired' | 'not_found' | 'not_host'

export interface InviteResult {
  status: InviteStatus
  list_id?: string
  title?: string
}

export async function acceptInvite(token: string): Promise<InviteResult> {
  if (MOCK) return (await mock()).acceptInvite(token)
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) throw error
  return data as InviteResult
}

export const inviteUrl = (token: string) => `${window.location.origin}/admin/convite/${token}`

/** A co-host removes themself from a list (the owner can't: they hand it over or delete it). */
export async function leaveList(listId: string): Promise<void> {
  if (MOCK) return (await mock()).leaveList(listId)
  const { data } = await supabase.auth.getUser()
  const { error } = await supabase.from('list_admins').delete().eq('list_id', listId).eq('user_id', data.user?.id ?? '')
  if (error) throw error
}

/** The owner hands the list to one of its co-hosts and stays on as a co-host. */
export async function transferOwnership(listId: string, userId: string): Promise<boolean> {
  if (MOCK) return (await mock()).transferOwnership(listId, userId)
  const { data, error } = await supabase.rpc('transfer_ownership', { p_list: listId, p_user: userId })
  if (error) throw error
  return data as boolean
}

/** Deletes the list's photos, then the list (gifts, claims, hosts and invites go with it). Owner only. */
export async function deleteList(listId: string): Promise<void> {
  if (MOCK) return (await mock()).deleteList(listId)
  // Photos first: once the list is gone, nobody passes the storage policy for its folder any more.
  const bucket = supabase.storage.from('gift-images')
  for (;;) {
    const { data: files, error } = await bucket.list(listId, { limit: 100 })
    if (error) throw error
    if (!files?.length) break
    const { error: removeError } = await bucket.remove(files.map((f) => `${listId}/${f.name}`))
    if (removeError) throw removeError
  }
  const { error } = await supabase.from('lists').delete().eq('id', listId)
  if (error) throw error
}

/** Removes photos a gift no longer uses. Links and data URLs are skipped. */
export async function deleteGiftPhotos(paths: string[]): Promise<void> {
  const stored = paths.filter(isStoragePath)
  if (!stored.length || MOCK) return
  const { error } = await supabase.storage.from('gift-images').remove(stored)
  if (error) throw error
}
