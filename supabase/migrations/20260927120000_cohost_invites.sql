-- Co-host invites + list editing hardening.
--
-- The owner of a list creates a one-time invite link (valid 7 days) and sends it to a partner.
-- The partner signs in (Google / email) and accept_invite() adds them to list_admins.

-- ---------------------------------------------------------------------------
-- Hosts may edit the party details, but not owner_id or share_token.
-- (The "admins update lists" policy alone would let a co-host take over ownership.)
-- ---------------------------------------------------------------------------

revoke update on public.lists from anon, authenticated;
grant update (title, event_at, address, theme) on public.lists to authenticated;

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

create table public.list_invites (
  token       text primary key
              default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_x'),
  list_id     uuid not null references public.lists (id) on delete cascade,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users (id) on delete set null,
  used_at     timestamptz
);

create index list_invites_list_idx on public.list_invites (list_id);

alter table public.list_invites enable row level security;

-- Same rule as co-hosts themselves: only the owner invites.
create policy "owner manages invites" on public.list_invites
  for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

-- Accept an invite. Returns { status, list_id?, title? } with status
-- 'ok' | 'already_host' | 'used' | 'expired' | 'not_found' | 'not_host'.
create or replace function public.accept_invite(p_token text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  i public.list_invites;
  t text;
begin
  if not public.is_host() then
    return jsonb_build_object('status', 'not_host');
  end if;

  select * into i from public.list_invites where token = p_token for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select title into t from public.lists where id = i.list_id;

  if public.is_list_admin(i.list_id) then
    return jsonb_build_object('status', 'already_host', 'list_id', i.list_id, 'title', t);
  end if;
  if i.used_at is not null then
    return jsonb_build_object('status', 'used');
  end if;
  if i.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;

  insert into public.list_admins (list_id, user_id) values (i.list_id, auth.uid())
  on conflict do nothing;
  update public.list_invites set used_by = auth.uid(), used_at = now() where token = p_token;

  return jsonb_build_object('status', 'ok', 'list_id', i.list_id, 'title', t);
end;
$$;

-- The hosts of a list with their emails (hosts can't read auth.users directly).
-- Only returns rows to someone who is a host of that list.
create or replace function public.list_hosts(p_list uuid)
returns table (user_id uuid, email text, is_owner boolean, is_me boolean)
language sql stable security definer
set search_path = public
as $$
  select a.user_id, u.email::text, a.user_id = l.owner_id, a.user_id = auth.uid()
  from public.list_admins a
  join public.lists l on l.id = a.list_id
  join auth.users u on u.id = a.user_id
  where a.list_id = p_list
    and public.is_list_admin(p_list)
  order by a.user_id = l.owner_id desc, a.created_at
$$;

revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.list_hosts(uuid) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.list_hosts(uuid) to authenticated;
