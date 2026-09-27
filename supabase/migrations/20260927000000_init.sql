-- Eu Levo — initial schema
-- Run with the Supabase CLI (`supabase db push`) or paste into Dashboard → SQL Editor.
--
-- Security model
--   * Hosts (admins) sign in with Google or an email link. They manage lists they belong to.
--   * Guests sign in ANONYMOUSLY (no name). Their anonymous user id is their "device".
--   * Guests never read tables directly: they only call the security-definer functions
--     get_list / claim_gift / release_claim at the bottom of this file.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when the caller is a real (non-anonymous) signed-in user.
create or replace function public.is_host()
returns boolean
language sql stable
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- Random, URL-safe 10 character token for share links.
create or replace function public.new_share_token()
returns text
language sql volatile
as $$
  select substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=', '-_x'), 1, 10)
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  event_at     timestamptz,
  address      text check (char_length(address) <= 300),
  share_token  text not null unique default public.new_share_token(),
  theme        text not null default 'azulejo',
  created_at   timestamptz not null default now()
);

create table public.list_admins (
  list_id    uuid not null references public.lists (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table public.gifts (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references public.lists (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  description  text check (char_length(description) <= 1000),
  room         text,
  images       text[] not null default '{}',            -- storage paths in bucket gift-images
  links        jsonb  not null default '[]'::jsonb,     -- [{ "label": "...", "url": "https://..." }]
  repeatable   boolean not null default false,
  max_claims   integer check (max_claims is null or max_claims > 0), -- null + repeatable = unlimited
  sort         integer not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index gifts_list_idx on public.gifts (list_id, sort);

create table public.claims (
  id             uuid primary key default gen_random_uuid(),
  gift_id        uuid not null references public.gifts (id) on delete cascade,
  list_id        uuid not null references public.lists (id) on delete cascade,
  device_id      uuid not null,                          -- anonymous auth user id of the guest
  claimed_at     timestamptz not null default now(),
  lat_rounded    numeric(6, 2),                          -- ~1 km, only with consent
  lng_rounded    numeric(6, 2),
  area_label     text,                                   -- e.g. "Near Pinheiros" (optional)
  device_summary text,                                   -- e.g. "iPhone"
  released_at    timestamptz
);
create index claims_gift_active_idx on public.claims (gift_id) where released_at is null;
create index claims_device_idx on public.claims (device_id, list_id);

-- ---------------------------------------------------------------------------
-- Admin membership
-- ---------------------------------------------------------------------------

create or replace function public.is_list_admin(p_list uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.list_admins
    where list_id = p_list and user_id = auth.uid()
  )
$$;

-- The creator of a list automatically becomes its first admin.
create or replace function public.add_owner_as_admin()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.list_admins (list_id, user_id) values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger lists_add_owner_as_admin
after insert on public.lists
for each row execute function public.add_owner_as_admin();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.lists       enable row level security;
alter table public.list_admins enable row level security;
alter table public.gifts       enable row level security;
alter table public.claims      enable row level security;

-- lists
create policy "hosts create lists" on public.lists
  for insert to authenticated
  with check (public.is_host() and owner_id = auth.uid());

create policy "admins read lists" on public.lists
  for select to authenticated
  using (public.is_list_admin(id));

create policy "admins update lists" on public.lists
  for update to authenticated
  using (public.is_list_admin(id))
  with check (public.is_list_admin(id));

create policy "owner deletes list" on public.lists
  for delete to authenticated
  using (owner_id = auth.uid());

-- list_admins (co-hosts): admins see who else manages the list; only the owner adds/removes
create policy "admins read co-hosts" on public.list_admins
  for select to authenticated
  using (public.is_list_admin(list_id));

create policy "owner manages co-hosts" on public.list_admins
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

-- gifts
create policy "admins manage gifts" on public.gifts
  for all to authenticated
  using (public.is_list_admin(list_id))
  with check (public.is_list_admin(list_id));

-- claims: admins can read and release (update); guests go through functions only
create policy "admins read claims" on public.claims
  for select to authenticated
  using (public.is_list_admin(list_id));

create policy "admins update claims" on public.claims
  for update to authenticated
  using (public.is_list_admin(list_id))
  with check (public.is_list_admin(list_id));

-- ---------------------------------------------------------------------------
-- Guest functions (security definer — they bypass RLS in a controlled way)
-- ---------------------------------------------------------------------------

-- Everything a guest needs for one list: the list, gifts that still have room,
-- and the caller's own active claims. Never exposes other guests' claims.
create or replace function public.get_list(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  l public.lists;
begin
  select * into l from public.lists where share_token = p_token;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'list', jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'event_at', l.event_at,
      'address', l.address,
      'theme', l.theme
    ),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id,
               'title', g.title,
               'description', g.description,
               'room', g.room,
               'images', to_jsonb(g.images),
               'links', g.links,
               'repeatable', g.repeatable,
               'max_claims', g.max_claims,
               'claim_count', g.claim_count,
               'mine', g.mine
             ) order by g.sort, g.created_at)
      from (
        select gi.*,
               (select count(*) from public.claims c
                 where c.gift_id = gi.id and c.released_at is null) as claim_count,
               exists (select 1 from public.claims c
                 where c.gift_id = gi.id and c.released_at is null
                   and c.device_id = auth.uid()) as mine
        from public.gifts gi
        where gi.list_id = l.id and not gi.archived
      ) g
      where case
              when g.repeatable then g.max_claims is null or g.claim_count < g.max_claims or g.mine
              else g.claim_count = 0 or g.mine
            end
    ), '[]'::jsonb),
    'mine', coalesce((
      select jsonb_agg(jsonb_build_object(
               'claim_id', c.id,
               'gift_id', g.id,
               'title', g.title,
               'images', to_jsonb(g.images),
               'links', g.links,
               'repeatable', g.repeatable,
               'claimed_at', c.claimed_at,
               'others', (select count(*) from public.claims o
                           where o.gift_id = g.id and o.released_at is null and o.id <> c.id)
             ) order by c.claimed_at)
      from public.claims c
      join public.gifts g on g.id = c.gift_id
      where c.list_id = l.id and c.device_id = auth.uid() and c.released_at is null
    ), '[]'::jsonb)
  );
end;
$$;

-- Atomically claim a gift. Returns 'ok' | 'taken' | 'already_yours' | 'not_found'.
-- The row lock (FOR UPDATE) means two guests tapping at the same time cannot both win.
create or replace function public.claim_gift(
  p_gift   uuid,
  p_lat    numeric default null,
  p_lng    numeric default null,
  p_device text    default null
)
returns text
language plpgsql volatile security definer
set search_path = public
as $$
declare
  g public.gifts;
  active_count integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into g from public.gifts where id = p_gift and not archived for update;
  if not found then
    return 'not_found';
  end if;

  if exists (select 1 from public.claims
             where gift_id = p_gift and device_id = auth.uid() and released_at is null) then
    return 'already_yours';
  end if;

  select count(*) into active_count
  from public.claims where gift_id = p_gift and released_at is null;

  if (not g.repeatable and active_count >= 1)
     or (g.repeatable and g.max_claims is not null and active_count >= g.max_claims) then
    return 'taken';
  end if;

  insert into public.claims (gift_id, list_id, device_id, lat_rounded, lng_rounded, device_summary)
  values (
    p_gift,
    g.list_id,
    auth.uid(),
    round(p_lat, 2),
    round(p_lng, 2),
    left(p_device, 60)
  );

  return 'ok';
end;
$$;

-- Release a claim. Guests can release their own; list admins can release any in their lists.
create or replace function public.release_claim(p_claim uuid)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
begin
  update public.claims
     set released_at = now()
   where id = p_claim
     and released_at is null
     and (device_id = auth.uid() or public.is_list_admin(list_id));
  return found;
end;
$$;

-- Privacy: wipe locations one week after the party.
create or replace function public.purge_old_locations()
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.claims c
     set lat_rounded = null, lng_rounded = null, area_label = null
    from public.lists l
   where l.id = c.list_id
     and l.event_at < now() - interval '7 days'
     and (c.lat_rounded is not null or c.area_label is not null);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Function permissions: only signed-in users (guests are signed in anonymously).
revoke all on function public.get_list(text) from public, anon;
revoke all on function public.claim_gift(uuid, numeric, numeric, text) from public, anon;
revoke all on function public.release_claim(uuid) from public, anon;
revoke all on function public.purge_old_locations() from public, anon, authenticated;
grant execute on function public.get_list(text) to authenticated;
grant execute on function public.claim_gift(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.release_claim(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: gift photos
-- Files are stored as  <list_id>/<random>.webp  so we can check list membership.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('gift-images', 'gift-images', true)
on conflict (id) do nothing;

create policy "admins upload gift images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gift-images'
    and public.is_host()
    and public.is_list_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "admins change gift images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'gift-images'
    and public.is_list_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "admins delete gift images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'gift-images'
    and public.is_list_admin(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Optional: daily location cleanup with pg_cron.
-- Enable "pg_cron" in Dashboard → Database → Extensions, then run:
--
--   select cron.schedule('eulevo-purge-locations', '0 4 * * *',
--                        $$ select public.purge_old_locations(); $$);
-- ---------------------------------------------------------------------------
