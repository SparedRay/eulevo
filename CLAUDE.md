# Eu Levo — notes for Claude

Gift-list web app for a housewarming ("chá de casa nova"). Hosts create a list and share one link; guests open it, tap **"Quero levar este"**, confirm ("Sim, confirmo que levo"), and their phone remembers what they're bringing. No names, no guest accounts. Users are mostly **Brazilian Portuguese speakers, many of them older**, so simplicity beats cleverness every time.

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
src/lib/               supabase client + auth helpers, install.ts (PWA install + service worker registration, production only), lastList.ts, api.ts (typed wrappers for every Supabase call), mock.ts (dev-only demo data, kept per tab in sessionStorage), image.ts (shrink photos before upload), format.ts (pt-BR dates), calendar.ts (.ics), device.ts
src/stores/guest.ts    guest state: load, 20 s auto-refresh, claim, release
src/styles/            tokens.css (Azulejo palette) + base.css (.page .btn .card .strip .note .field .check …)
src/components/        TileBand, GiftPhoto, GiftForm (add/edit gift), SharePanel (copy / WhatsApp / QR via `uqr`), HostNav (Presentes · Quem vai levar o quê · Festa e anfitriões), PartyFields (name/date/time/address), LoadingState (spinner + "Carregando…"), PasswordField, AccountCard, InstallHint
src/views/guest/       ListView → ConfirmView → DoneView | TakenView, MineView
src/views/admin/       LoginView, ListsView (create list), GiftsView, GiftFormView (add/edit a gift on its own screen), ClaimsView, SettingsView (edit party, co-hosts, invites), InviteView (/admin/convite/:token)
docs/design.md         visual identity + UX rules — read before touching UI
```

## Data & security model — don't break these

- **Guests sign in anonymously** (`ensureGuestSession`). Their anonymous `auth.uid()` is the "device". They never query tables; they only call RPCs: `get_list(token)`, `claim_gift(...)`, `release_claim(id)`.
- `claim_gift` locks the gift row (`FOR UPDATE`) so two guests can't claim the same one-time gift. Returns `ok | taken | already_yours | not_found`.
- A non-repeatable gift disappears from the list once claimed. A repeatable gift stays until `max_claims` is reached (null = unlimited).
- **Hosts** are non-anonymous users (Google, email link, the email's code via `verifyOtp` — needs the templates in `docs/email-templates/` pasted into Supabase — or email + an optional password set under "Sua conta" via `updateUser`). `is_host()` and `is_list_admin(list_id)` gate everything through RLS. The list creator is added to `list_admins` by a trigger. Co-hosts join through one-time invite links (`list_invites`, 7 days, owner-only) accepted by `accept_invite(token)`; `list_hosts(list)` returns hosts' emails. Hosts can update only `title, event_at, address, theme` on `lists` and only `area_label` on `claims` (column grants), so a co-host can't take over `owner_id`; ownership moves only through `transfer_ownership(list, user)`. Co-hosts can leave (`list_admins` delete of their own row); a restrictive policy keeps the owner a host of their own list. Deleting a list removes its Storage photos first (the storage policy needs the list to exist).
- **Privacy:** guests never see other guests' claims. Hosts see claim time, device type, a short device tag and a location rounded to ~1 km **only if the guest ticked the box**. Locations are purged 7 days after the party.
- Schema changes go in a **new** migration file (`supabase/migrations/<timestamp>_<name>.sql`); never edit an applied migration.
- **Migrations must be additive** (new tables, columns, functions; never rename or drop what the app uses). Open apps keep running the previous build until their next change of screen (`src/lib/updates.ts`), so the old code must keep working against the new database.
- Photos go in the public bucket `gift-images` at `<list_id>/<uuid>.webp`, shrunk in the browser before upload (target ≤ 1200 px, WebP).

## UI rules (Azulejo, for older users)

- **All UI copy is Brazilian Portuguese.** Plain, warm, no jargon ("Quero levar este", "Sim, confirmo que levo", "Não, voltar para a lista", "Não posso levar"). The first tap must never sound final (see docs/design.md rule 3).
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
| Live updates: `watchList()` in `src/lib/live.ts` (Realtime broadcast `list:<id>` from triggers + refresh on return + 30 s poll); guest screens share one via `store.startLive()/stopLive()` | ✅ needs migration `20260928000000_live_updates.sql` |
| Host sign-in + create list | ✅ first version |
| Host gifts screen (add/edit gift, photo upload, share: copy / WhatsApp / QR) | ✅ first version, **untested against real data** |
| Host "Quem vai levar o quê" (claims + "Liberar") | ✅ first version, **untested against real data** |
| Edit party details, co-host invites (migration `20260927120000_cohost_invites.sql`) | ✅ first version, **untested against real data** |
| Host login: Google button hidden unless the provider is on | ✅ |
| pg_cron location purge (ClaimsView promises it: schedule before launch) | ⏳ |
| Polish: page titles, WhatsApp preview text, share shortcut on phones, quieter guest refresh, release errors, `randomId()` for plain-http phones | ✅ |
| PWA: manifest, icons, `public/sw.js` (network-first pages, cached `/assets/`), install card for hosts, home page reopens the last list | ✅ first version |

## Next steps (in order)

1. ~~Mock mode~~ ✅
2. ~~Host gifts screen~~ ✅ (replaced or removed photos are deleted from Storage after the save; archived gifts keep theirs)
3. ~~Host claims screen~~ ✅ (ClaimsView fills `area_label` via Nominatim reverse lookup, 1 request/s, from the host's browser; "Ver no mapa" link until then or if it fails)
4. Supabase setup: all migrations up to `20260928000000_live_updates.sql` are applied (run by hand in the SQL Editor on 2026-09-27). Still to do: mark them in the CLI history with `npx supabase migration repair --status applied 20260927000000 20260927120000 20260927180000 20260928000000` (after `supabase login` + `link`), so `supabase db push` only runs new files; paste `docs/email-templates/` into Authentication → Emails → Templates; set up custom SMTP (README "Your own email sender"); schedule the `pg_cron` location purge; redirect URLs include `http://localhost:5173/**`.
5. Test everything against real data (walkthrough in the chat of 2026-09-27: host sign-in → gifts → two guest browsers → claims → Liberar → invite a co-host).

## Conventions

- Small, focused commits; run `npm run build` first. End commit messages with a `Co-Authored-By` line for Claude.
- Prefer editing existing components and base classes over new abstractions.
- Don't add a UI framework (Vuetify, Tailwind, etc.); the design system is the CSS in `src/styles`.
