/**
 * In-memory stand-in for Supabase, used only when MOCK is on (see src/config.ts).
 * Mirrors the rules of get_list / claim_gift / release_claim in supabase/migrations.
 * State survives reloads in this tab (sessionStorage); the test banner's button starts it over.
 *
 * Demo list: /l/demo (hosts: /admin → "Casa Nova da Ana e do Rui").
 * - "Jogo de panelas" is already claimed by someone else, so guests don't see it.
 * - "Panos de prato" is repeatable without a limit; "Taças de vinho" allows 2 people.
 * - "Toalhas de banho" gets taken by someone else ~12 s after the list opens (open screens update live), or the
 *   moment you confirm it if you're quicker, to show both "taken" paths.
 * - Email code: 123456. Password sign-in: any email with the password eulevo2026 (change it under "Sua conta").
 * - Co-hosts: you own the demo list with rui@exemplo.com. /admin/convite/convite-demo makes you a co-host of
 *   Carla's list; /admin/convite/convite-usado and /admin/convite/convite-vencido show the error screens.
 */
import { deviceTag, type ClaimResult, type Invite, type InviteResult, type ListHost, type GiftInput, type GiftLink, type GuestList, type HostClaim, type HostGift, type HostList, type NewList } from './api'

interface MockList extends HostList {
  owner_id: string
  theme: string
  created_at: string
}

interface MockGift {
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
}

interface MockClaim {
  id: string
  gift_id: string
  list_id: string
  device_id: string
  claimed_at: string
  lat_rounded: number | null
  lng_rounded: number | null
  area_label: string | null
  device_summary: string | null
  released_at: string | null
}

/** The signed-in host (a real account in the real app). */
const HOST_ME = 'host-me'
const HOST_EMAIL = 'voce@exemplo.com'

/** This browser's "device" (the anonymous auth uid in the real app). */
const ME = '5e10c0de-0000-4000-8000-000000000001'
/** Gift that someone else grabs right before you confirm it. */
const RACE_GIFT = 'g-toalhas'

let seq = 0
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

/** Small drawing so one demo gift shows a real photo instead of the placeholder. */
const KETTLE_PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#F4E6C8"/>` +
      `<path d="M70 190h100l-8-86H78z" fill="#1E4FA3"/><path d="M78 104c4-30 80-30 84 0" fill="#1E4FA3"/>` +
      `<path d="M162 120c30 0 30 50 2 52" fill="none" stroke="#14213D" stroke-width="10"/>` +
      `<path d="M72 128L40 104" stroke="#1E4FA3" stroke-width="14" stroke-linecap="round"/>` +
      `<rect x="108" y="70" width="24" height="10" rx="4" fill="#14213D"/><rect x="60" y="188" width="120" height="10" rx="4" fill="#14213D"/></svg>`,
  )

const lists: MockList[] = [
  {
    id: 'list-demo',
    title: 'Casa Nova da Ana e do Rui',
    event_at: new Date(2026, 9, 24, 16, 0).toISOString(),
    address: 'Rua das Laranjeiras, 120, apto 32, Pinheiros, São Paulo',
    share_token: 'demo',
    owner_id: HOST_ME,
    theme: 'azulejo',
    created_at: minutesAgo(60 * 24 * 3),
  },
  {
    id: 'list-carla',
    title: 'Chá de bebê da Carla',
    event_at: new Date(2026, 10, 7, 15, 0).toISOString(),
    address: 'Rua Harmonia, 45, Vila Madalena, São Paulo',
    share_token: 'carla',
    owner_id: 'host-carla',
    theme: 'azulejo',
    created_at: minutesAgo(60 * 24),
  },
]

interface MockAdmin {
  list_id: string
  user_id: string
  email: string
  created_at: string
}

const admins: MockAdmin[] = [
  { list_id: 'list-demo', user_id: HOST_ME, email: HOST_EMAIL, created_at: minutesAgo(60 * 24 * 3) },
  { list_id: 'list-demo', user_id: 'host-rui', email: 'rui@exemplo.com', created_at: minutesAgo(60 * 24 * 2) },
  { list_id: 'list-carla', user_id: 'host-carla', email: 'carla@exemplo.com', created_at: minutesAgo(60 * 24) },
]

interface MockInvite extends Invite {
  list_id: string
  used_at: string | null
}

const invites: MockInvite[] = [
  { token: 'convite-demo', list_id: 'list-carla', created_at: minutesAgo(60), expires_at: minutesAgo(-60 * 24 * 7), used_at: null },
  { token: 'convite-usado', list_id: 'list-carla', created_at: minutesAgo(600), expires_at: minutesAgo(-60 * 24 * 6), used_at: minutesAgo(300) },
  { token: 'convite-vencido', list_id: 'list-carla', created_at: minutesAgo(60 * 24 * 9), expires_at: minutesAgo(60 * 24 * 2), used_at: null },
]

const isAdmin = (listId: string, userId = HOST_ME) => admins.some((a) => a.list_id === listId && a.user_id === userId)

/** `order` only spaces out created_at so the demo gifts keep this order. */
function gift(p: Partial<MockGift> & Pick<MockGift, 'id' | 'title'>, order: number): MockGift {
  return {
    list_id: 'list-demo',
    description: null,
    room: null,
    images: [],
    links: [],
    repeatable: false,
    max_claims: null,
    archived: false,
    created_at: minutesAgo(60 * 24 * 3 - order),
    ...p,
    sort: 0, // like the real table: every gift is 0, so the order is by created_at
  }
}

const gifts: MockGift[] = [
  gift({ id: 'g-panelas', title: 'Jogo de panelas', description: 'Antiaderente, 5 peças.' }, 1),
  gift(
    {
      id: 'g-liquidificador',
      title: 'Liquidificador',
      description: 'Qualquer marca, de preferência com 3 velocidades ou mais.',
      links: [{ label: 'Loja', url: 'https://www.amazon.com.br/s?k=liquidificador' }],
    },
    2,
  ),
  gift(
    {
      id: 'g-panos',
      title: 'Panos de prato',
      description: 'Brancos ou azuis. Pode trazer quantos quiser!',
      repeatable: true,
    },
    3,
  ),
  gift({ id: 'g-tacas', title: 'Taças de vinho', description: 'Jogo com 6 taças.', repeatable: true, max_claims: 2 }, 4),
  gift(
    {
      id: RACE_GIFT,
      title: 'Toalhas de banho',
      description: 'Teste: outra pessoa escolhe este presente uns 12 segundos depois que a lista abre, ou no instante em que você confirmar.',
    },
    5,
  ),
  gift(
    {
      id: 'g-chaleira',
      title: 'Chaleira elétrica',
      description: 'Inox, 1,7 litro, 220 V.',
      images: [KETTLE_PHOTO],
      links: [{ label: 'Loja', url: 'https://www.amazon.com.br/s?k=chaleira+eletrica' }],
    },
    6,
  ),
  gift({ id: 'g-vaso', title: 'Vaso de planta' }, 7),
  gift({ id: 'g-tapete', title: 'Tapete da sala', description: 'Tiramos da lista: já compramos.', archived: true }, 8),
]

function claim(p: Pick<MockClaim, 'gift_id' | 'device_id'> & Partial<MockClaim>): MockClaim {
  return {
    id: newId('claim'),
    list_id: 'list-demo',
    claimed_at: new Date().toISOString(),
    lat_rounded: null,
    lng_rounded: null,
    area_label: null,
    device_summary: 'Android',
    released_at: null,
    ...p,
  }
}

const claims: MockClaim[] = [
  claim({
    gift_id: 'g-panelas',
    device_id: 'a3f97b21-0000-4000-8000-00000000000a',
    claimed_at: minutesAgo(60 * 20),
    device_summary: 'iPhone',
    lat_rounded: -23.56,
    lng_rounded: -46.69,
  }),
  claim({
    gift_id: 'g-panos',
    device_id: 'c812e4d0-0000-4000-8000-00000000000b',
    claimed_at: minutesAgo(60 * 5),
    lat_rounded: -23.6,
    lng_rounded: -46.66,
    area_label: 'Perto de Moema',
  }),
  claim({ gift_id: 'g-panos', device_id: '71bc09aa-0000-4000-8000-00000000000c', claimed_at: minutesAgo(45), device_summary: 'Windows' }),
  claim({ gift_id: 'g-tacas', device_id: 'a3f97b21-0000-4000-8000-00000000000a', claimed_at: minutesAgo(60 * 30), device_summary: 'iPhone' }),
]

let hostSignedIn = false

const STORE_KEY = 'eulevo-mock'

/** Swap the seed data for what this tab saved, so typing a URL or reloading keeps the demo going. */
function restore() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (!saved.admins) return // saved before co-hosts existed: start fresh
    lists.splice(0, lists.length, ...saved.lists)
    gifts.splice(0, gifts.length, ...saved.gifts)
    claims.splice(0, claims.length, ...saved.claims)
    admins.splice(0, admins.length, ...saved.admins)
    invites.splice(0, invites.length, ...saved.invites)
    hostSignedIn = saved.hostSignedIn
  } catch {
    // Unreadable or blocked storage: start from the seed data.
  }
}
restore()

function persist() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ lists, gifts, claims, admins, invites, hostSignedIn }))
  } catch {
    // Full (big photos) or blocked: the demo keeps working in memory.
  }
}

/** Throws the saved demo away and reloads with the seed data. */
export function resetMock() {
  try {
    sessionStorage.removeItem(STORE_KEY)
  } catch {
    // nothing saved
  }
  location.reload()
}

// Stand-in for the Realtime "list changed" broadcast. Every write notifies the list it touched.
const listeners = new Map<string, Set<() => void>>()

export function onListChanged(listId: string, fn: () => void): () => void {
  if (!listeners.has(listId)) listeners.set(listId, new Set())
  listeners.get(listId)!.add(fn)
  return () => listeners.get(listId)?.delete(fn)
}

function notify(listId: string) {
  listeners.get(listId)?.forEach((fn) => fn())
}

/** Pretend network delay, so loading states show up. */
function later<T>(value: () => T, ms = 250): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(value())
        persist()
      } catch (e) {
        reject(e)
      }
    }, ms),
  )
}

const activeClaims = (giftId: string) => claims.filter((c) => c.gift_id === giftId && !c.released_at)
/** Deep copy through JSON, like a real network round trip. (structuredClone rejects Vue's reactive proxies.) */
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v))

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const mockHostSignedIn = () => hostSignedIn
/** Mock password for every demo host email until "Sua conta" changes it. */
let mockPassword = 'eulevo2026'

export function mockSignInWithPassword(email: string, password: string): Promise<'ok' | 'wrong'> {
  return later(() => {
    if (!email.includes('@') || password !== mockPassword) return 'wrong'
    hostSignedIn = true
    return 'ok'
  }, 500)
}

/** The sign-in email's code in mock mode. */
export function mockSignInWithCode(code: string): Promise<'ok' | 'wrong'> {
  return later(() => {
    if (code !== '123456') return 'wrong'
    hostSignedIn = true
    return 'ok'
  }, 500)
}

export function mockSetPassword(password: string): Promise<'ok' | 'same'> {
  return later(() => {
    if (password === mockPassword) return 'same'
    mockPassword = password
    return 'ok'
  })
}

export const mockHostEmail = () => Promise.resolve(hostSignedIn ? HOST_EMAIL : null)

export function mockSignIn() {
  hostSignedIn = true
  persist()
}
export function mockSignOut() {
  hostSignedIn = false
  persist()
}

// ---------------------------------------------------------------------------
// Guest RPCs
// ---------------------------------------------------------------------------

/** Once per page load: the race gift gets taken by someone else ~12 s after the demo list first opens. */
let raceTimer: ReturnType<typeof setTimeout> | undefined

export function getList(token: string): Promise<GuestList | null> {
  return later(() => {
    const l = lists.find((x) => x.share_token === token)
    if (!l) return null
    if (l.id === 'list-demo' && !raceTimer) raceTimer = setTimeout(someoneElseTakesRaceGift, 12_000)

    const visible = gifts
      .filter((g) => g.list_id === l.id && !g.archived)
      .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
      .map((g) => {
        const active = activeClaims(g.id)
        return { g, count: active.length, mine: active.some((c) => c.device_id === ME) }
      })
      .filter(({ g, count, mine }) =>
        g.repeatable ? g.max_claims === null || count < g.max_claims || mine : count === 0 || mine,
      )

    const mine = claims
      .filter((c) => c.list_id === l.id && c.device_id === ME && !c.released_at)
      .sort((a, b) => a.claimed_at.localeCompare(b.claimed_at))
      .map((c) => {
        const g = gifts.find((x) => x.id === c.gift_id)!
        return {
          claim_id: c.id,
          gift_id: g.id,
          title: g.title,
          images: g.images,
          links: g.links,
          repeatable: g.repeatable,
          claimed_at: c.claimed_at,
          others: activeClaims(g.id).length - 1,
        }
      })

    return copy({
      list: { id: l.id, title: l.title, event_at: l.event_at, address: l.address, theme: l.theme },
      gifts: visible.map(({ g, count, mine }) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        room: g.room,
        images: g.images,
        links: g.links,
        repeatable: g.repeatable,
        max_claims: g.max_claims,
        claim_count: count,
        mine,
      })),
      mine,
    })
  })
}

export function claimGift(
  giftId: string,
  opts: { lat?: number; lng?: number; device?: string },
): Promise<ClaimResult> {
  return later(() => {
    const g = gifts.find((x) => x.id === giftId && !x.archived)
    if (!g) return 'not_found'

    const active = activeClaims(giftId)
    if (active.some((c) => c.device_id === ME)) return 'already_yours'

    if (giftId === RACE_GIFT && active.length === 0) {
      someoneElseTakesRaceGift()
      return 'taken'
    }

    if ((!g.repeatable && active.length >= 1) || (g.repeatable && g.max_claims !== null && active.length >= g.max_claims)) {
      return 'taken'
    }

    claims.push(
      claim({
        gift_id: giftId,
        list_id: g.list_id,
        device_id: ME,
        lat_rounded: opts.lat ?? null,
        lng_rounded: opts.lng ?? null,
        device_summary: opts.device?.slice(0, 60) ?? null,
      }),
    )
    notify(g.list_id)
    return 'ok'
  }, 600)
}

/** Another guest claims the race gift (if it's still free) and every open screen hears about it. */
function someoneElseTakesRaceGift() {
  if (activeClaims(RACE_GIFT).length) return
  claims.push(claim({ gift_id: RACE_GIFT, device_id: '9b4e5c77-0000-4000-8000-00000000000f', device_summary: 'iPhone' }))
  persist()
  notify('list-demo')
}

/** Guests release their own claims; the mock host is admin of every list, so it may release any. */
export function releaseClaim(claimId: string): Promise<boolean> {
  return later(() => {
    const c = claims.find((x) => x.id === claimId && !x.released_at)
    if (!c || (c.device_id !== ME && !hostSignedIn)) return false
    c.released_at = new Date().toISOString()
    notify(c.list_id)
    return true
  })
}

// ---------------------------------------------------------------------------
// Host tables
// ---------------------------------------------------------------------------

export function hostLists(): Promise<HostList[]> {
  return later(() =>
    copy(
      lists
        .filter((l) => isAdmin(l.id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, title, event_at, address, share_token }) => ({ id, title, event_at, address, share_token })),
    ),
  )
}

export function createList(input: NewList): Promise<string> {
  return later(() => {
    const id = newId('list')
    const now = new Date().toISOString()
    lists.push({ ...input, id, share_token: newId('t'), owner_id: HOST_ME, theme: 'azulejo', created_at: now })
    admins.push({ list_id: id, user_id: HOST_ME, email: HOST_EMAIL, created_at: now })
    return id
  })
}

export function hostList(id: string): Promise<HostList | null> {
  return later(() => {
    const l = lists.find((x) => x.id === id && isAdmin(x.id))
    return l ? copy({ id: l.id, title: l.title, event_at: l.event_at, address: l.address, share_token: l.share_token }) : null
  })
}

export function hostGifts(listId: string): Promise<HostGift[]> {
  return later(() =>
    copy(
      gifts
        .filter((g) => g.list_id === listId)
        .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
        .map((g) => ({ ...g, claim_count: activeClaims(g.id).length })),
    ),
  )
}

export function createGift(listId: string, input: GiftInput): Promise<void> {
  return later(() => {
    notify(listId)
    gifts.push({
      ...copy(input),
      id: newId('g'),
      list_id: listId,
      room: null,
      sort: 0,
      archived: false,
      created_at: new Date().toISOString(),
    })
  })
}

export function updateGift(id: string, input: GiftInput): Promise<void> {
  return later(() => {
    const g = gifts.find((x) => x.id === id)
    if (!g) throw new Error('gift not found')
    Object.assign(g, copy(input))
    notify(g.list_id)
  })
}

export function setGiftArchived(id: string, archived: boolean): Promise<void> {
  return later(() => {
    const g = gifts.find((x) => x.id === id)
    if (!g) throw new Error('gift not found')
    g.archived = archived
    notify(g.list_id)
  })
}

/** Keeps the photo in memory as a data URL; imageUrl() passes data URLs through. */
export function uploadGiftPhoto(photo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => setTimeout(() => resolve(reader.result as string), 400)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(photo)
  })
}

export function hostClaims(listId: string): Promise<HostClaim[]> {
  return later(() =>
    claims
      .filter((c) => c.list_id === listId && !c.released_at)
      .sort((a, b) => b.claimed_at.localeCompare(a.claimed_at))
      .map((c) => {
        const g = gifts.find((x) => x.id === c.gift_id)!
        return {
          id: c.id,
          gift_id: g.id,
          gift_title: g.title,
          repeatable: g.repeatable,
          claimed_at: c.claimed_at,
          device_summary: c.device_summary,
          device_tag: deviceTag(c.device_id),
          lat: c.lat_rounded,
          lng: c.lng_rounded,
          area_label: c.area_label,
        }
      }),
  )
}

// ---------------------------------------------------------------------------
// Party details and co-hosts
// ---------------------------------------------------------------------------

export function updateList(id: string, input: NewList): Promise<void> {
  return later(() => {
    const l = lists.find((x) => x.id === id && isAdmin(x.id))
    if (!l) throw new Error('list not found')
    Object.assign(l, copy(input))
    notify(id)
  })
}

export function listHosts(listId: string): Promise<ListHost[]> {
  return later(() => {
    const l = lists.find((x) => x.id === listId)
    if (!l || !isAdmin(listId)) return []
    return admins
      .filter((a) => a.list_id === listId)
      .sort((a, b) => Number(b.user_id === l.owner_id) - Number(a.user_id === l.owner_id) || a.created_at.localeCompare(b.created_at))
      .map((a) => ({ user_id: a.user_id, email: a.email, is_owner: a.user_id === l.owner_id, is_me: a.user_id === HOST_ME }))
  })
}

const isOwner = (listId: string) => lists.some((l) => l.id === listId && l.owner_id === HOST_ME)

export function removeCoHost(listId: string, userId: string): Promise<void> {
  return later(() => {
    if (!isOwner(listId)) throw new Error('only the owner removes co-hosts')
    const i = admins.findIndex((a) => a.list_id === listId && a.user_id === userId)
    if (i >= 0) admins.splice(i, 1)
  })
}

export function openInvites(listId: string): Promise<Invite[]> {
  return later(() => {
    if (!isOwner(listId)) return []
    const now = new Date().toISOString()
    return invites
      .filter((i) => i.list_id === listId && !i.used_at && i.expires_at > now)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ token, created_at, expires_at }) => ({ token, created_at, expires_at }))
  })
}

export function createInvite(listId: string): Promise<Invite> {
  return later(() => {
    if (!isOwner(listId)) throw new Error('only the owner invites')
    const invite = { token: newId('convite'), list_id: listId, created_at: new Date().toISOString(), expires_at: minutesAgo(-60 * 24 * 7), used_at: null }
    invites.push(invite)
    return { token: invite.token, created_at: invite.created_at, expires_at: invite.expires_at }
  })
}

export function cancelInvite(token: string): Promise<void> {
  return later(() => {
    const i = invites.findIndex((x) => x.token === token && isOwner(x.list_id))
    if (i >= 0) invites.splice(i, 1)
  })
}

export function acceptInvite(token: string): Promise<InviteResult> {
  return later(() => {
    if (!hostSignedIn) return { status: 'not_host' }
    const i = invites.find((x) => x.token === token)
    if (!i) return { status: 'not_found' }
    const title = lists.find((l) => l.id === i.list_id)?.title
    if (isAdmin(i.list_id)) return { status: 'already_host', list_id: i.list_id, title }
    if (i.used_at) return { status: 'used' }
    if (i.expires_at < new Date().toISOString()) return { status: 'expired' }
    admins.push({ list_id: i.list_id, user_id: HOST_ME, email: HOST_EMAIL, created_at: new Date().toISOString() })
    i.used_at = new Date().toISOString()
    return { status: 'ok', list_id: i.list_id, title }
  }, 500)
}

export function leaveList(listId: string): Promise<void> {
  return later(() => {
    if (isOwner(listId)) throw new Error('the owner stays a host')
    const i = admins.findIndex((a) => a.list_id === listId && a.user_id === HOST_ME)
    if (i >= 0) admins.splice(i, 1)
  })
}

export function transferOwnership(listId: string, userId: string): Promise<boolean> {
  return later(() => {
    const l = lists.find((x) => x.id === listId)
    if (!l || l.owner_id !== HOST_ME || !isAdmin(listId, userId)) return false
    l.owner_id = userId
    return true
  })
}

export function deleteList(listId: string): Promise<void> {
  return later(() => {
    if (!isOwner(listId)) throw new Error('only the owner deletes a list')
    const giftIds = new Set(gifts.filter((g) => g.list_id === listId).map((g) => g.id))
    const keep = <T>(arr: T[], ok: (x: T) => boolean) => arr.splice(0, arr.length, ...arr.filter(ok))
    keep(claims, (c) => !giftIds.has(c.gift_id))
    keep(gifts, (g) => g.list_id !== listId)
    keep(admins, (a) => a.list_id !== listId)
    keep(invites, (i) => i.list_id !== listId)
    keep(lists, (l) => l.id !== listId)
    notify(listId)
  })
}

/** Stands in for OpenStreetMap: a São Paulo neighbourhood picked from the coordinates. */
export function lookupArea(lat: number, lng: number): Promise<string | null> {
  const places = ['Pinheiros', 'Vila Mariana', 'Santana', 'Lapa', 'Tatuapé', 'Butantã']
  return later(() => `Perto de ${places[Math.abs(Math.round((lat + lng) * 100)) % places.length]}, São Paulo`, 800)
}

export function saveAreaLabel(claimId: string, label: string): Promise<void> {
  return later(() => {
    const c = claims.find((x) => x.id === claimId)
    if (c) c.area_label = label
  })
}
