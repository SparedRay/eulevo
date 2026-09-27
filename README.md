# Eu Levo

Listas de presentes simples, sem cadastro. Hosts create a gift list and share one link; guests open it, pick a gift with **"Eu levo este"**, and their phone remembers what they're bringing. No names, no guest accounts.

Built to be usable by older relatives: one column, big text, big buttons labelled in words, a confirm step before anything is saved.

- **Front-end:** Vue 3 + Vite + TypeScript, Pinia, Vue Router
- **Back-end:** Supabase (Postgres, Auth, Storage) — free tier
- **Hosting:** Cloudflare Workers static assets — free tier
- **UI language:** Brazilian Portuguese

## Status

| Phase | What | State |
|---|---|---|
| 1 | Project setup, database schema, security rules | ✅ done |
| 3 | Guest flow: list → confirm → thank you / "someone was faster" → what I'm bringing | ✅ first version |
| 2 | Host: sign in, create list | ✅ first version |
| 2 | Host: add/edit gifts with photos, share link (copy / WhatsApp / QR) | ⏳ next |
| 4 | Host: who's bringing what, free a gift up, location cleanup job | ⏳ |
| 5 | Polish, PWA | ⏳ |

## Run it locally

Requires Node 20.19+ (or 22+).

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev                  # http://localhost:5173
npm run dev:mock             # no Supabase needed: demo list at /l/demo, host screens at /admin
```

## One-time setup

### 1. Supabase (database, login, photos)

1. Create a free project at <https://supabase.com/dashboard> (region: São Paulo).
2. **Database:** open *SQL Editor*, paste the whole file `supabase/migrations/20260927000000_init.sql`, and run it.
   (Or with the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.)
3. **Guests without accounts:** *Authentication → Sign In / Providers →* turn on **Allow anonymous sign-ins**.
4. **Host sign-in:**
   - Email links work out of the box (*Email* provider).
   - Google (optional): create an OAuth client in Google Cloud Console, then paste its ID and secret under *Providers → Google*.
5. **Redirect URLs:** *Authentication → URL Configuration*
   - Site URL: your Cloudflare address (see step 2 below)
   - Additional redirect URLs: `http://localhost:5173/**` and `https://<your Cloudflare address>/**`
6. **Keys:** *Project Settings → API* → copy the Project URL and the anon/publishable key into `.env.local`.
7. *(Optional, privacy)* *Database → Extensions →* enable `pg_cron`, then run the `cron.schedule(...)` line at the bottom of the migration. It wipes guest locations 7 days after the party.

Free-tier note: Supabase pauses a free project after about a week with no activity. Open the dashboard and click *Restore* if that happens.

### 2. Cloudflare (the public website)

The repo deploys as a Cloudflare Worker that serves static files. `wrangler.jsonc` points it at `dist/` and turns on single-page-app mode, so deep links like `/l/abc123` open the app. Don't add a `_redirects` file: Cloudflare rejects `/* /index.html` as a loop.

1. <https://dash.cloudflare.com> → *Workers & Pages → Create → Import a repository* → pick this repo.
2. Name: `eulevo` → the site will be `https://eulevo.<your-subdomain>.workers.dev`.
3. Build command `npm run build`, deploy command `npx wrangler deploy` (the defaults).
4. **Build** variables (*Settings → Build → Variables and secrets*, not the runtime ones): `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` and `NODE_VERSION` = `22`. Vite bakes the Supabase values in at build time.
5. Every push to `main` redeploys automatically.
6. Put the final address in Supabase → *Authentication → URL Configuration* (Site URL + `https://<address>/**`).

## How it works

**Guests** open `/l/<share_token>`. The app signs them in anonymously; that anonymous id is their "device". They never read database tables directly: they only call three database functions:

- `get_list(token)`: the list, the gifts that still have room, and *their own* claims (never other guests').
- `claim_gift(gift, lat?, lng?, device?)`: locks the gift row, so two people tapping at once can't both win. Returns `ok`, `taken`, `already_yours` or `not_found`.
- `release_claim(claim)`: "Não posso levar". Guests can release their own claims; hosts can release any claim in their lists.

**Repeatable gifts:** `repeatable = true` with `max_claims = null` means unlimited; with a number it closes at that count. One-time gifts disappear from the list once claimed.

**Privacy:** guests are anonymous. Hosts see claim time, device type, a short device tag and, only if the guest ticked the box, a location rounded to ~1 km.

**Lost phone:** if a guest clears their browser, the app forgets what they claimed, but the claim stays. They ask the host, who can free the gift up.

**Photos:** stored in the public bucket `gift-images` under `<list_id>/…`; only that list's hosts can upload.

## Project layout

```
supabase/migrations/   database schema, security rules and functions
src/lib/               supabase client, API calls, date formatting (pt-BR), calendar (.ics), device helpers
src/stores/guest.ts    guest state (list, my gifts, claim, release, auto-refresh every 20 s)
src/styles/            Azulejo design tokens + base styles
src/components/        TileBand (tile header), GiftPhoto (arch-framed photo)
src/views/guest/       ListView, ConfirmView, DoneView, TakenView, MineView
src/views/admin/       LoginView, ListsView, GiftsView*, ClaimsView*   (* placeholders)
docs/design.md         visual identity and UX rules
```
