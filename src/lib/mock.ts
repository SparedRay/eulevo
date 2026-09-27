/**
 * In-memory stand-in for Supabase, used only when MOCK is on (see src/config.ts).
 * Mirrors the rules of get_list / claim_gift / release_claim in supabase/migrations.
 * Everything resets on page reload.
 *
 * Demo list: /l/demo (hosts: /admin → "Casa Nova da Ana e do Rui").
 * - "Jogo de panelas" is already claimed by someone else, so guests don't see it.
 * - "Panos de prato" is repeatable without a limit; "Taças de vinho" allows 2 people.
 * - "Toalhas de banho" gets taken by someone else the moment you confirm it, to show the "taken" screen.
 */
import type { ClaimResult, GiftInput, GiftLink, GuestList, HostGift, HostList, NewList } from './api'

interface MockList extends HostList {
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

/** This browser's "device" (the anonymous auth uid in the real app). */
const ME = 'device-me'
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
    theme: 'azulejo',
    created_at: minutesAgo(60 * 24 * 3),
  },
]

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
      description: 'Teste: outra pessoa escolhe este presente um instante antes de você confirmar.',
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
    device_id: 'device-a',
    claimed_at: minutesAgo(60 * 20),
    device_summary: 'iPhone',
    lat_rounded: -23.56,
    lng_rounded: -46.69,
  }),
  claim({ gift_id: 'g-panos', device_id: 'device-b', claimed_at: minutesAgo(60 * 5) }),
  claim({ gift_id: 'g-panos', device_id: 'device-c', claimed_at: minutesAgo(45), device_summary: 'Windows' }),
  claim({ gift_id: 'g-tacas', device_id: 'device-d', claimed_at: minutesAgo(60 * 30), device_summary: 'iPhone' }),
]

let hostSignedIn = false

/** Pretend network delay, so loading states show up. */
function later<T>(value: () => T, ms = 250): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(value())
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
export function mockSignIn() {
  hostSignedIn = true
}
export function mockSignOut() {
  hostSignedIn = false
}

// ---------------------------------------------------------------------------
// Guest RPCs
// ---------------------------------------------------------------------------

export function getList(token: string): Promise<GuestList | null> {
  return later(() => {
    const l = lists.find((x) => x.share_token === token)
    if (!l) return null

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
      claims.push(claim({ gift_id: giftId, device_id: 'device-fast', device_summary: 'iPhone' }))
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
    return 'ok'
  }, 600)
}

/** Guests release their own claims; the mock host is admin of every list, so it may release any. */
export function releaseClaim(claimId: string): Promise<boolean> {
  return later(() => {
    const c = claims.find((x) => x.id === claimId && !x.released_at)
    if (!c || (c.device_id !== ME && !hostSignedIn)) return false
    c.released_at = new Date().toISOString()
    return true
  })
}

// ---------------------------------------------------------------------------
// Host tables
// ---------------------------------------------------------------------------

export function hostLists(): Promise<HostList[]> {
  return later(() =>
    copy(
      [...lists]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, title, event_at, address, share_token }) => ({ id, title, event_at, address, share_token })),
    ),
  )
}

export function createList(input: NewList): Promise<string> {
  return later(() => {
    const id = newId('list')
    lists.push({ ...input, id, share_token: newId('t'), theme: 'azulejo', created_at: new Date().toISOString() })
    return id
  })
}

export function hostList(id: string): Promise<HostList | null> {
  return later(() => {
    const l = lists.find((x) => x.id === id)
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
  })
}

export function setGiftArchived(id: string, archived: boolean): Promise<void> {
  return later(() => {
    const g = gifts.find((x) => x.id === id)
    if (!g) throw new Error('gift not found')
    g.archived = archived
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
