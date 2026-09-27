# Eu Levo

Listas de presentes simples, sem cadastro. Hosts create a gift list and share one link; guests open it, pick a gift with **"Eu levo este"**, and their phone remembers what they're bringing. No names, no guest accounts.

Built to be usable by older relatives: one column, big text, big buttons labelled in words, a confirm step before anything is saved.

- **Front-end:** Vue 3 + Vite + TypeScript, Pinia, Vue Router
- **Back-end:** Supabase (Postgres, Auth, Storage) — free tier
- **Hosting:** Cloudflare Workers static assets — free tier
- **UI language:** Brazilian Portuguese

## Status

All screens are built. Everything has been clicked through in mock mode (`npm run dev:mock`); **none of it has been tested against a real Supabase project yet.**

| Area | What | State |
|---|---|---|
| Setup | Database schema, security rules, database functions | ✅ done |
| Setup | Mock mode: every screen without Supabase | ✅ done |
| Guests | List → confirm → thank you / "someone was faster" → what I'm bringing, release, add to calendar | ✅ first version |
| Hosts | Sign in by email link (Google button appears only if the provider is on), create a list | ✅ first version |
| Hosts | Add / edit / remove gifts with photos; share link (copy / WhatsApp / QR) | ✅ first version |
| Hosts | Who's bringing what, free a gift up ("Liberar") | ✅ first version |
| Hosts | Edit party name, date, time and address; invite a co-host by link | ✅ first version |
| Launch | Supabase settings + second migration, then a full test with real data | ⏳ next |
| Privacy | Daily job that deletes guest locations 7 days after the party (`pg_cron`) | ⏳ not scheduled |
| Later | Install as an app (PWA), polish | ⏳ |

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
2. **Database:** open *SQL Editor* and run each file in `supabase/migrations/` in name order (`20260927000000_init.sql`, `20260927120000_cohost_invites.sql`, `20260927180000_host_tools.sql`). Each later file only adds to the ones before it.
   (Or with the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.)
3. **Guests without accounts:** *Authentication → Sign In / Providers →* turn on **Allow anonymous sign-ins** and **Allow new users to sign up**. Both are needed: every guest's anonymous session counts as a new sign-up, and so does a host's or co-host's first email sign-in.
4. **Host sign-in:**
   - Email links work out of the box (*Email* provider).
   - Google (optional): create an OAuth client in Google Cloud Console, then paste its ID and secret under *Providers → Google*.
     The "Continuar com Google" button only appears once this provider is turned on.
5. **Redirect URLs:** *Authentication → URL Configuration*
   - Site URL: your Cloudflare address (see step 2 below)
   - Additional redirect URLs: `http://localhost:5173/**` and `https://<your Cloudflare address>/**`
6. **Keys:** *Project Settings → API* → copy the Project URL and the anon/publishable key into `.env.local`.
7. **Privacy cleanup:** *Database → Extensions →* enable `pg_cron`, then run the `cron.schedule(...)` line at the bottom of `20260927000000_init.sql`. It wipes guest locations 7 days after the party, which the hosts' *Quem vai levar o quê* screen promises.

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

**Privacy:** guests are anonymous. Hosts see claim time, device type, a short device tag and, only if the guest ticked the box, a location rounded to ~1 km. The hosts' screen turns that rounded location into a neighbourhood name ("Perto de Pinheiros, São Paulo") with OpenStreetMap's free Nominatim service, once per claim, and saves it as `area_label`; the cleanup job wipes it with the location.

**Lost phone:** if a guest clears their browser, the app forgets what they claimed, but the claim stays. They ask the host, who can free the gift up.

**Photos:** stored in the public bucket `gift-images` under `<list_id>/…`; only that list's hosts can upload. They are shrunk in the browser first (longest side 1200 px, WebP; JPEG on Safari).

**Co-hosts:** the person who creates a list owns it. On *Festa e anfitriões* they can create a one-time invite link (valid 7 days) and send it to a partner, who signs in with their own email and becomes a co-host (`accept_invite(token)`). Co-hosts can do everything except invite or remove other hosts, and can leave a list on their own. The owner can hand the list over to a co-host (`transfer_ownership`) or delete it with its photos; nobody can change the owner any other way.

## Project layout

```
supabase/migrations/   database schema, security rules and functions
src/lib/               supabase client + sign-in, api.ts (every database call), mock.ts (demo data, dev only),
                       photo shrinking, date formatting (pt-BR), calendar (.ics), clipboard, device helpers
src/stores/guest.ts    guest state (list, my gifts, claim, release, auto-refresh every 20 s)
src/styles/            Azulejo design tokens + base styles
src/components/        TileBand, GiftPhoto, GiftForm, SharePanel (link / WhatsApp / QR), HostNav, PartyFields
src/views/guest/       ListView, ConfirmView, DoneView, TakenView, MineView
src/views/admin/       LoginView, ListsView, GiftsView, ClaimsView, SettingsView (party + co-hosts), InviteView
docs/design.md         visual identity and UX rules
```
