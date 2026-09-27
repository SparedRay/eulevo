# Eu Levo — notes for Claude

Gift-list web app for a housewarming ("chá de casa nova"). Hosts create a list and share one link; guests open it, tap **"Eu levo este"**, confirm, and their phone remembers what they're bringing. No names, no guest accounts. Users are mostly **Brazilian Portuguese speakers, many of them older**, so simplicity beats cleverness every time.

## Commands

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # vue-tsc type-check + vite build — run before every commit
npm run typecheck
```

Env: `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (anon/publishable key). Never commit it.

## Stack

Vue 3 (`<script setup lang="ts">`), Vite, TypeScript strict, Pinia (setup stores), Vue Router. Supabase for Postgres, Auth and Storage. Cloudflare Pages hosting (`public/_redirects` handles SPA deep links). Free tiers only: don't add paid services or heavy dependencies without asking.

## Layout

```
supabase/migrations/   schema + RLS + functions (source of truth for the DB)
src/config.ts          APP_NAME
src/lib/               supabase client, api.ts (typed RPC wrappers), format.ts (pt-BR dates), calendar.ts (.ics), device.ts
src/stores/guest.ts    guest state: load, 20 s auto-refresh, claim, release
src/styles/            tokens.css (Azulejo palette) + base.css (.page .btn .card .strip .note .field .check …)
src/components/        TileBand, GiftPhoto
src/views/guest/       ListView → ConfirmView → DoneView | TakenView, MineView
src/views/admin/       LoginView, ListsView (create list), GiftsView (stub), ClaimsView (stub)
docs/design.md         visual identity + UX rules — read before touching UI
```

## Data & security model — don't break these

- **Guests sign in anonymously** (`ensureGuestSession`). Their anonymous `auth.uid()` is the "device". They never query tables; they only call RPCs: `get_list(token)`, `claim_gift(...)`, `release_claim(id)`.
- `claim_gift` locks the gift row (`FOR UPDATE`) so two guests can't claim the same one-time gift. Returns `ok | taken | already_yours | not_found`.
- A non-repeatable gift disappears from the list once claimed. A repeatable gift stays until `max_claims` is reached (null = unlimited).
- **Hosts** are non-anonymous users (Google or email link). `is_host()` and `is_list_admin(list_id)` gate everything through RLS. The list creator is added to `list_admins` by a trigger.
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
| Guest flow (list, confirm, done, taken, mine, release, .ics) | ✅ first version, **untested against real data** |
| Host sign-in + create list | ✅ first version |
| Host gifts screen (add/edit gift, photo upload, share: copy / WhatsApp / QR) | ⏳ next |
| Host "Quem vai levar o quê" (claims + "Liberar") | ⏳ |
| pg_cron location purge, PWA, polish | ⏳ |

## Next steps (in order)

1. **Mock mode for local testing.** When `VITE_MOCK=1`, `src/lib/api.ts` and the host screens use an in-memory demo list (token `demo`, ~6 gifts incl. one repeatable, one already claimed), so every screen can be clicked through without Supabase. Keep the mock in `src/lib/mock.ts` and out of production builds.
2. Host gifts screen (`GiftsView`): list of gifts with status in words, "Adicionar presente" form (photo, nome, descrição, link da loja, "Mais de um convidado pode levar?" Sim/Não → quantos), edit and archive, plus a share panel (copy link, `https://wa.me/?text=…`, QR code: use a small dependency or generate an SVG).
3. Host claims screen (`ClaimsView`).
4. Supabase setup check: anonymous sign-ins enabled, redirect URLs include `http://localhost:5173/**`.

## Conventions

- Small, focused commits; run `npm run build` first. End commit messages with a `Co-Authored-By` line for Claude.
- Prefer editing existing components and base classes over new abstractions.
- Don't add a UI framework (Vuetify, Tailwind, etc.); the design system is the CSS in `src/styles`.
