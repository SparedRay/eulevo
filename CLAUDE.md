# Eu Levo — notes for Claude

Gift-list web app for a housewarming ("chá de casa nova"). Hosts create a list and share one link; guests open it, tap **"Eu levo este"**, confirm, and their phone remembers what they're bringing. No names, no guest accounts. Users are mostly **Brazilian Portuguese speakers, many of them older**, so simplicity beats cleverness every time.

## Commands

```bash
npm install
npm run dev         # http://localhost:5173
npm run dev:mock    # same, with in-memory demo data (no Supabase): guest list at /l/demo, hosts at /admin
npm run build       # vue-tsc type-check + vite build — run before every commit
npm run typecheck
```

Env: `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (anon/publishable key). Never commit it.

Mock mode (`MOCK` in `src/config.ts`, `VITE_MOCK=1` via `.env.mock`) only works on the dev server; production builds leave `mock.ts` out. Views never call `supabase` directly: go through `api.ts` / `supabase.ts` helpers, each with an `if (MOCK)` branch, and mirror any new RPC or table logic in `mock.ts`.

## Stack

Vue 3 (`<script setup lang="ts">`), Vite, TypeScript strict, Pinia (setup stores), Vue Router. Supabase for Postgres, Auth and Storage. Cloudflare hosting as a Worker with static assets: `wrangler.jsonc` sets `not_found_handling: "single-page-application"` for deep links. Never add a `_redirects` SPA rule; Cloudflare rejects it as an infinite loop. Free tiers only: don't add paid services or heavy dependencies without asking.

## Layout

```
supabase/migrations/   schema + RLS + functions (source of truth for the DB)
src/config.ts          APP_NAME
src/lib/               supabase client + auth helpers, api.ts (typed wrappers for every Supabase call), mock.ts (dev-only demo data, kept per tab in sessionStorage), image.ts (shrink photos before upload), format.ts (pt-BR dates), calendar.ts (.ics), device.ts
src/stores/guest.ts    guest state: load, 20 s auto-refresh, claim, release
src/styles/            tokens.css (Azulejo palette) + base.css (.page .btn .card .strip .note .field .check …)
src/components/        TileBand, GiftPhoto, GiftForm (add/edit gift), SharePanel (copy / WhatsApp / QR via `uqr`), HostNav (Presentes · Quem vai levar o quê · Festa e anfitriões), PartyFields (name/date/time/address)
src/views/guest/       ListView → ConfirmView → DoneView | TakenView, MineView
src/views/admin/       LoginView, ListsView (create list), GiftsView, ClaimsView, SettingsView (edit party, co-hosts, invites), InviteView (/admin/convite/:token)
docs/design.md         visual identity + UX rules — read before touching UI
```

## Data & security model — don't break these

- **Guests sign in anonymously** (`ensureGuestSession`). Their anonymous `auth.uid()` is the "device". They never query tables; they only call RPCs: `get_list(token)`, `claim_gift(...)`, `release_claim(id)`.
- `claim_gift` locks the gift row (`FOR UPDATE`) so two guests can't claim the same one-time gift. Returns `ok | taken | already_yours | not_found`.
- A non-repeatable gift disappears from the list once claimed. A repeatable gift stays until `max_claims` is reached (null = unlimited).
- **Hosts** are non-anonymous users (Google or email link). `is_host()` and `is_list_admin(list_id)` gate everything through RLS. The list creator is added to `list_admins` by a trigger. Co-hosts join through one-time invite links (`list_invites`, 7 days, owner-only) accepted by `accept_invite(token)`; `list_hosts(list)` returns hosts' emails. Hosts can update only `title, event_at, address, theme` on `lists` and only `area_label` on `claims` (column grants), so a co-host can't take over `owner_id`; ownership moves only through `transfer_ownership(list, user)`. Co-hosts can leave (`list_admins` delete of their own row); a restrictive policy keeps the owner a host of their own list. Deleting a list removes its Storage photos first (the storage policy needs the list to exist).
- **Privacy:** guests never see other guests' claims. Hosts see claim time, device type, a short device tag and a location rounded to ~1 km **only if the guest ticked the box**. Locations are purged 7 days after the party.
- Schema changes go in a **new** migration file (`supabase/migrations/<timestamp>_<name>.sql`); never edit the applied init migration.
- Photos go in the public bucket `gift-images` at `<list_id>/<uuid>.webp`, shrunk in the browser before upload (target ≤ 1200 px, WebP).

## UI rules (Azulejo, for older users)

- **All UI copy is Brazilian Portuguese.** Plain, warm, no jargon ("Eu levo este", "Sim, eu levo", "Não, voltar", "Não posso levar").
- One column on phones. No filters, tabs, swipes or hidden gestures on guest screens.
- Buttons ≥ 56px (`var(--tap)`), labelled in words; icon-only buttons are not allowed. Body text 18px, never below 16px.
- Every save goes through a confirm step with explicit Sim / Não, and releasing a gift also asks "Tem certeza?".
- Party date/time is shown as a sentence (`partyWhen()` → "sábado, 24 de outubro, às 16h").
- Error messages say what to do next, never codes.
- Use the tokens in `src/styles/tokens.css` and classes in `base.css`; don't hard-code colors. Fonts: DM Serif Display (titles) + Atkinson Hyperlegible (body). No emoji in UI.
- Real `<button>` / `<a>` / `<label>` elements; keep focus outlines.
- Design mockups: canvas "Housewarming Gift List", page "C·4 Azulejo — final flow" (its copy is in English, but the app is pt-BR).

## Status

| Area | State |
|---|---|
| Setup, schema, RLS, RPCs | ✅ |
| Mock mode (`npm run dev:mock`) | ✅ |
| Guest flow (list, confirm, done, taken, mine, release, .ics) | ✅ first version, **untested against real data** |
| Host sign-in + create list | ✅ first version |
| Host gifts screen (add/edit gift, photo upload, share: copy / WhatsApp / QR) | ✅ first version, **untested against real data** |
| Host "Quem vai levar o quê" (claims + "Liberar") | ✅ first version, **untested against real data** |
| Edit party details, co-host invites (migration `20260927120000_cohost_invites.sql`) | ✅ first version, **untested against real data** |
| Host login: Google button hidden unless the provider is on | ✅ |
| pg_cron location purge (ClaimsView promises it: schedule before launch) | ⏳ |
| PWA, polish | ⏳ |

## Next steps (in order)

1. ~~Mock mode~~ ✅
2. ~~Host gifts screen~~ ✅ (removing or replacing a photo leaves the old file in Storage; clean up later if it matters)
3. ~~Host claims screen~~ ✅ (locations show `area_label` if set, else a "Ver no mapa" OpenStreetMap link; nothing fills `area_label` yet)
4. Supabase setup: run the migrations `20260927120000_cohost_invites.sql` and `20260927180000_host_tools.sql`; turn on "Allow new users to sign up" (off on 2026-09-27, which blocks anonymous guests and new host emails); redirect URLs include `http://localhost:5173/**`.
5. Test everything against real data (walkthrough in the chat of 2026-09-27: host sign-in → gifts → two guest browsers → claims → Liberar → invite a co-host).

## Conventions

- Small, focused commits; run `npm run build` first. End commit messages with a `Co-Authored-By` line for Claude.
- Prefer editing existing components and base classes over new abstractions.
- Don't add a UI framework (Vuetify, Tailwind, etc.); the design system is the CSS in `src/styles`.
